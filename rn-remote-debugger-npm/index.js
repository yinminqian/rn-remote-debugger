// RN Remote Debugger - npm package
const path = require('path');
let ws = null;
let messageQueue = [];

const sendMessage = (data) => {
  const message = JSON.stringify(data);

  if (ws && ws.readyState === 1) {
    try {
      ws.send(message);
    } catch (e) {
      messageQueue.push(message);
    }
  } else {
    messageQueue.push(message);
    if (messageQueue.length > 100) {
      messageQueue.shift();
    }
  }
};

// 保存原始 console 方法
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
};

const setupConsoleInterceptor = () => {
  const sendLog = (type, args) => {
    sendMessage({
      channel: 'console',
      type,
      args: args.map(arg => {
        try {
          if (typeof arg === 'object' && arg !== null) {
            return arg;
          }
          return arg;
        } catch (e) {
          return String(arg);
        }
      }),
      timestamp: new Date().toISOString()
    });
  };

  console.log = function (...args) {
    originalConsole.log(...args);
    sendLog('log', args);
  };

  console.warn = function (...args) {
    originalConsole.warn(...args);
    sendLog('warn', args);
  };

  console.error = function (...args) {
    originalConsole.error(...args);
    sendLog('error', args);
  };

  console.info = function (...args) {
    originalConsole.info(...args);
    sendLog('info', args);
  };

  console.debug = function (...args) {
    originalConsole.debug(...args);
    sendLog('debug', args);
  };
};

const setupNetworkInterceptor = () => {
  const sendNetwork = (data) => {
    sendMessage({
      channel: 'network',
      ...data
    });
  };

  // 将 Headers 实例 / 数组 / 普通对象统一序列化为普通对象
  const normalizeHeaders = (headers) => {
    if (!headers) return {};
    if (typeof headers.forEach === 'function' && !Array.isArray(headers)) {
      const result = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }
    return { ...headers };
  };

  // 拦截 fetch
  const originalFetch = global.fetch;
  global.fetch = function (...args) {
    const startTime = Date.now();
    const input = args[0];
    const url = typeof input === 'string' ? input : input.url;
    const options = args[1] || {};
    const method = options.method || (typeof input === 'object' && input.method) || 'GET';

    // 合并 Request 对象自带的 headers 和 options.headers
    const requestHeaders = {
      ...(typeof input === 'object' ? normalizeHeaders(input.headers) : {}),
      ...normalizeHeaders(options.headers),
    };

    const requestId = `${Date.now()}-${Math.random()}`;

    sendNetwork({
      type: 'request',
      id: requestId,
      url,
      method,
      headers: requestHeaders,
      body: options.body,
      timestamp: new Date().toISOString()
    });

    return originalFetch.apply(this, args)
      .then(response => {
        const duration = Date.now() - startTime;

        // 第一次：立即发送状态码
        sendNetwork({
          type: 'response',
          id: requestId,
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: '',
          duration,
          timestamp: new Date().toISOString()
        });

        // 第二次：异步发送完整数据
        response.clone().text()
          .then(body => {
            sendNetwork({
              type: 'response',
              id: requestId,
              url,
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body,
              duration,
              timestamp: new Date().toISOString()
            });
          })
          .catch(() => {
            // body 读取失败，不再发送
          });

        return response;
      })
      .catch(error => {
        const duration = Date.now() - startTime;

        sendNetwork({
          type: 'error',
          id: requestId,
          url,
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });

        throw error;
      });
  };

  // 解析 XHR 响应头字符串为对象
  const parseResponseHeaders = (headerStr) => {
    const headers = {};
    if (!headerStr) return headers;
    headerStr.split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key) headers[key] = value;
      }
    });
    return headers;
  };

  // 拦截 XMLHttpRequest
  const OriginalXHR = global.XMLHttpRequest;
  global.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    const requestId = `${Date.now()}-${Math.random()}`;
    let url = '';
    let method = '';
    let startTime = 0;
    const requestHeaders = {};

    const originalOpen = xhr.open;
    xhr.open = function (m, u, ...rest) {
      method = m;
      url = u;
      return originalOpen.apply(this, [m, u, ...rest]);
    };

    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function (key, value) {
      requestHeaders[key] = value;
      return originalSetRequestHeader.apply(this, arguments);
    };

    const originalSend = xhr.send;
    xhr.send = function (body) {
      startTime = Date.now();

      sendNetwork({
        type: 'request',
        id: requestId,
        url,
        method,
        headers: requestHeaders,
        body,
        timestamp: new Date().toISOString()
      });

      return originalSend.apply(this, arguments);
    };

    xhr.addEventListener('load', function () {
      const duration = Date.now() - startTime;

      sendNetwork({
        type: 'response',
        id: requestId,
        url,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseResponseHeaders(xhr.getAllResponseHeaders && xhr.getAllResponseHeaders()),
        body: xhr.responseText,
        duration,
        timestamp: new Date().toISOString()
      });
    });

    xhr.addEventListener('error', function () {
      const duration = Date.now() - startTime;

      sendNetwork({
        type: 'error',
        id: requestId,
        url,
        error: 'Network request failed',
        duration,
        timestamp: new Date().toISOString()
      });
    });

    return xhr;
  };
};

const connect = (port = 8989, host = 'localhost') => {
  try {
    ws = new WebSocket(`ws://${host}:${port}`);

    ws.onopen = () => {
      originalConsole.log(`[RN Remote Debugger] ✅ Connected to ${host}:${port}`);

      // 通知客户端 RN 是一次新会话（reload 或首次启动），让客户端清空旧数据
      try {
        ws.send(JSON.stringify({
          channel: 'session',
          type: 'start',
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        // 忽略发送失败
      }

      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        try {
          ws.send(msg);
        } catch (e) {
          break;
        }
      }
    };

    ws.onclose = () => {
      originalConsole.log('[RN Remote Debugger] ❌ Disconnected, reconnecting...');
      setTimeout(() => connect(port, host), 3000);
    };

    ws.onerror = (error) => {
      originalConsole.log('[RN Remote Debugger] Error:', error.message);
    };
  } catch (error) {
    originalConsole.log('[RN Remote Debugger] Connection failed:', error.message);
    setTimeout(() => connect(port, host), 3000);
  }
};

// 读取配置文件
const loadConfig = () => {
  if (!__DEV__) {
    return {};
  }
    try {
        // 从 node_modules/rn-remote-debugger/ 向上两级到项目根目录
        const config = require('../../rn-remote-debug.js');
        console.log("rn-remote-debug.js loaded===>", config);
        return config || {};
    } catch (e) {
        // 配置文件不存在或读取失败，返回空对象
        console.log("rn-remote-debug.js not found, using defaults");
        return {};
    }
};

const initRemoteDebugger = (options = {}) => {
  if (!__DEV__) {
    return { disconnect: () => { } };
  }

  // 读取配置文件并与传入的 options 合并（配置文件优先级更高）
  const fileConfig = loadConfig();
  const config = { ...options, ...fileConfig };

  const { port = 8989, host = 'localhost', enableConsole = true, enableNetwork = true } = config;

  if (enableConsole) {
    setupConsoleInterceptor();
  }

  if (enableNetwork) {
    setupNetworkInterceptor();
  }

  connect(port, host);

  return {
    disconnect: () => {
      if (ws) {
        ws.close();
      }
    }
  };
};

export default initRemoteDebugger;
