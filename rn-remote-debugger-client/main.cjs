const { app, BrowserWindow, ipcMain } = require('electron');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const PORT = 8989;
const isDev = !app.isPackaged;
const VITE_DEV_SERVER = 'http://localhost:5173';
let mainWindow;

// ---------- Ring buffers for MCP ----------
const MAX_NETWORK = 200;
const MAX_CONSOLE = 500;
const networkRequests = [];
const networkById = new Map();
const consoleLogs = [];

const clearBuffers = () => {
  networkRequests.length = 0;
  networkById.clear();
  consoleLogs.length = 0;
};

const handleNetworkMessage = (data) => {
  if (data.type === 'request') {
    const entry = {
      id: data.id,
      method: data.method,
      url: data.url,
      requestHeaders: data.headers || {},
      requestBody: data.body,
      status: 'pending',
      timestamp: data.timestamp,
    };
    networkById.set(data.id, entry);
    networkRequests.push(entry);
    while (networkRequests.length > MAX_NETWORK) {
      const removed = networkRequests.shift();
      networkById.delete(removed.id);
    }
  } else if (data.type === 'response') {
    const entry = networkById.get(data.id);
    if (entry) {
      entry.status = data.status;
      entry.statusText = data.statusText;
      entry.responseHeaders = data.headers || {};
      entry.responseBody = data.body;
      entry.duration = data.duration;
      entry.completedAt = data.timestamp;
    }
  } else if (data.type === 'error') {
    const entry = networkById.get(data.id);
    if (entry) {
      entry.status = 'error';
      entry.error = data.error;
      entry.duration = data.duration;
    }
  }
};

const handleConsoleMessage = (data) => {
  consoleLogs.push({
    level: data.type,
    args: data.args,
    timestamp: data.timestamp,
  });
  while (consoleLogs.length > MAX_CONSOLE) consoleLogs.shift();
};

const getBuffers = () => ({
  networkRequests,
  networkById,
  consoleLogs,
  clear: clearBuffers,
});

// ---------- MCP handler (lazy-loaded ESM) ----------
let mcpHandlePromise = null;
const getMcpHandler = () => {
  if (!mcpHandlePromise) {
    mcpHandlePromise = import('./mcp-server.mjs').then((m) => m.handleMcpRequest);
  }
  return mcpHandlePromise;
};

// ---------- HTTP + WebSocket server ----------
const server = http.createServer((req, res) => {
  if (req.url && (req.url === '/mcp' || req.url.startsWith('/mcp?') || req.url.startsWith('/mcp/'))) {
    // Collect request body for POST (MCP SDK accepts pre-parsed body)
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      let parsedBody;
      if (chunks.length > 0) {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) {
          try { parsedBody = JSON.parse(raw); } catch { parsedBody = undefined; }
        }
      }
      try {
        const handle = await getMcpHandler();
        await handle(req, res, parsedBody, getBuffers);
      } catch (err) {
        console.error('[MCP] load failed:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: String(err && err.message || err) }));
        }
      }
    });
    req.on('error', (err) => {
      console.error('[MCP] request error:', err);
    });
    return;
  }
  res.writeHead(404);
  res.end('Use Vite dev server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  ws.on('message', (message) => {
    const messageStr = message.toString();

    // Feed ring buffers for MCP (best-effort; never block relay)
    try {
      const data = JSON.parse(messageStr);
      if (data.channel === 'network') handleNetworkMessage(data);
      else if (data.channel === 'console') handleConsoleMessage(data);
      else if (data.channel === 'session' && (data.type === 'start' || data.type === 'clear')) clearBuffers();
    } catch {
      // ignore malformed messages
    }

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'hidden',
    title: 'Remote Console Debugger'
  });

  mainWindow.loadURL(VITE_DEV_SERVER);
  mainWindow.webContents.openDevTools();

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('toggle-devtools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
  }
});

app.whenReady().then(() => {
  const startServer = (port) => {
    server.listen(port, () => {
      console.log(`🚀 WebSocket server: ws://localhost:${port}`);
      console.log(`🧠 MCP endpoint:     http://localhost:${port}/mcp`);
      if (isDev) {
        console.log(`📦 Vite dev server: ${VITE_DEV_SERVER}`);
      }
      createWindow();
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  };

  startServer(PORT);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    server.close();
    app.quit();
  }
});
