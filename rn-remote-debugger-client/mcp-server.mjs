import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const truncate = (str, max) => {
  if (str == null) return str;
  if (typeof str !== 'string') {
    try { str = JSON.stringify(str); } catch { str = String(str); }
  }
  if (str.length <= max) return str;
  return str.slice(0, max) + `\n...[truncated ${str.length - max} chars]`;
};

const summarizeRequest = (req) => ({
  id: req.id,
  method: req.method,
  url: req.url,
  status: req.status,
  statusText: req.statusText,
  duration: req.duration,
  timestamp: req.timestamp,
  error: req.error,
});

const matchStatus = (filter, status) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return status === 'pending';
  if (filter === 'error') return status === 'error';
  if (typeof status !== 'number') return false;
  if (filter === 'success') return status >= 200 && status < 300;
  if (filter === 'clientError') return status >= 400 && status < 500;
  if (filter === 'serverError') return status >= 500;
  return true;
};

const buildServer = (getBuffers) => {
  const server = new McpServer({
    name: 'rn-remote-debugger',
    version: '1.0.0',
  });

  server.registerTool(
    'list_network_requests',
    {
      title: 'List network requests',
      description: 'List recent RN network requests. Returns summaries only (no headers/bodies). Use get_network_request for full detail.',
      inputSchema: {
        limit: z.number().int().min(1).max(500).optional().describe('Max items (default 50)'),
        since: z.string().optional().describe('ISO timestamp; only requests after this'),
        method: z.string().optional().describe('Filter by HTTP method (GET/POST/...)'),
        urlPattern: z.string().optional().describe('Case-insensitive substring match on url'),
        status: z.enum(['all', 'pending', 'success', 'error', 'clientError', 'serverError']).optional(),
      },
    },
    async ({ limit = 50, since, method, urlPattern, status = 'all' }) => {
      const { networkRequests } = getBuffers();
      let items = networkRequests.slice();
      if (since) items = items.filter((r) => (r.timestamp || '') > since);
      if (method) items = items.filter((r) => (r.method || '').toUpperCase() === method.toUpperCase());
      if (urlPattern) {
        const p = urlPattern.toLowerCase();
        items = items.filter((r) => (r.url || '').toLowerCase().includes(p));
      }
      items = items.filter((r) => matchStatus(status, r.status));
      const trimmed = items.slice(-limit).reverse().map(summarizeRequest);
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: trimmed.length, items: trimmed }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'get_network_request',
    {
      title: 'Get network request detail',
      description: 'Get full detail of a single request by id: request headers, request body, response headers, response body.',
      inputSchema: {
        id: z.string().describe('Request id from list_network_requests'),
        maxBodyChars: z.number().int().min(100).max(50000).optional().describe('Truncate bodies to this size (default 8000)'),
      },
    },
    async ({ id, maxBodyChars = 8000 }) => {
      const { networkById } = getBuffers();
      const req = networkById.get(id);
      if (!req) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `No request found with id=${id}` }) }],
          isError: true,
        };
      }
      const detail = {
        ...req,
        requestBody: truncate(req.requestBody, maxBodyChars),
        responseBody: truncate(req.responseBody, maxBodyChars),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }],
      };
    }
  );

  server.registerTool(
    'list_console_logs',
    {
      title: 'List console logs',
      description: 'List recent console logs forwarded from the RN app.',
      inputSchema: {
        limit: z.number().int().min(1).max(1000).optional().describe('Max items (default 100)'),
        since: z.string().optional().describe('ISO timestamp; only logs after this'),
        level: z.enum(['log', 'warn', 'error', 'info', 'debug']).optional(),
        textPattern: z.string().optional().describe('Case-insensitive substring match across log args'),
        maxArgChars: z.number().int().min(100).max(10000).optional().describe('Truncate each arg to this size (default 1000)'),
      },
    },
    async ({ limit = 100, since, level, textPattern, maxArgChars = 1000 }) => {
      const { consoleLogs } = getBuffers();
      let items = consoleLogs.slice();
      if (since) items = items.filter((l) => (l.timestamp || '') > since);
      if (level) items = items.filter((l) => l.level === level);
      if (textPattern) {
        const p = textPattern.toLowerCase();
        items = items.filter((l) => {
          try { return JSON.stringify(l.args).toLowerCase().includes(p); } catch { return false; }
        });
      }
      const trimmed = items.slice(-limit).reverse().map((l) => ({
        level: l.level,
        timestamp: l.timestamp,
        args: (l.args || []).map((a) => truncate(a, maxArgChars)),
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: trimmed.length, items: trimmed }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'search',
    {
      title: 'Search logs and network requests',
      description: 'Case-insensitive substring search across console logs and network requests (urls, headers, request/response bodies).',
      inputSchema: {
        keyword: z.string().min(1),
        scope: z.enum(['all', 'network', 'console']).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ keyword, scope = 'all', limit = 50 }) => {
      const { networkRequests, consoleLogs } = getBuffers();
      const k = keyword.toLowerCase();
      const results = [];
      if (scope === 'all' || scope === 'network') {
        for (const r of networkRequests) {
          let haystack = '';
          try {
            haystack = JSON.stringify({
              url: r.url,
              rh: r.requestHeaders,
              rb: r.requestBody,
              sh: r.responseHeaders,
              sb: r.responseBody,
              err: r.error,
            }).toLowerCase();
          } catch { /* skip */ }
          if (haystack.includes(k)) results.push({ kind: 'network', ...summarizeRequest(r) });
        }
      }
      if (scope === 'all' || scope === 'console') {
        for (const l of consoleLogs) {
          let haystack = '';
          try { haystack = JSON.stringify(l.args).toLowerCase(); } catch { /* skip */ }
          if (haystack.includes(k)) {
            results.push({
              kind: 'console',
              level: l.level,
              timestamp: l.timestamp,
              preview: truncate(JSON.stringify(l.args), 500),
            });
          }
        }
      }
      const trimmed = results.slice(-limit).reverse();
      return {
        content: [{ type: 'text', text: JSON.stringify({ total: trimmed.length, items: trimmed }, null, 2) }],
      };
    }
  );

  server.registerTool(
    'clear',
    {
      title: 'Clear all buffers',
      description: 'Clear all buffered network requests and console logs.',
      inputSchema: {},
    },
    async () => {
      getBuffers().clear();
      return { content: [{ type: 'text', text: 'cleared' }] };
    }
  );

  return server;
};

export const handleMcpRequest = async (req, res, parsedBody, getBuffers) => {
  const server = buildServer(getBuffers);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  } catch (err) {
    console.error('[MCP] handleRequest error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: String(err && err.message || err) }, id: null }));
    }
  }
};
