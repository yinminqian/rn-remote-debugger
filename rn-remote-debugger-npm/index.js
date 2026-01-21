// RN Remote Debugger - npm package
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

  // 拦截 fetch
  const originalFetch = global.fetch;
  global.fetch = function (...args) {
    const startTime = Date.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const options = args[1] || {};
    const method = options.method || 'GET';

    const requestId = `${Date.now()}-${Math.random()}`;

    sendNetwork({
      type: 'request',
      id: requestId,
      url,
      method,
      headers: options.headers || {},
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

  // 拦截 XMLHttpRequest
  const OriginalXHR = global.XMLHttpRequest;
  global.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    const requestId = `${Date.now()}-${Math.random()}`;
    let url = '';
    let method = '';
    let startTime = 0;

    const originalOpen = xhr.open;
    xhr.open = function (m, u, ...rest) {
      method = m;
      url = u;
      return originalOpen.apply(this, [m, u, ...rest]);
    };

    const originalSend = xhr.send;
    xhr.send = function (body) {
      startTime = Date.now();

      sendNetwork({
        type: 'request',
        id: requestId,
        url,
        method,
        headers: {},
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
        headers: {},
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

const connect = (port = 8989) => {
  try {
    ws = new WebSocket(`ws://localhost:${port}`);

    ws.onopen = () => {
      originalConsole.log('[RN Remote Debugger] ✅ Connected');

      // 发送队列中的消息
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
      setTimeout(() => connect(port), 3000);
    };

    ws.onerror = (error) => {
      originalConsole.log('[RN Remote Debugger] Error:', error.message);
    };
  } catch (error) {
    originalConsole.log('[RN Remote Debugger] Connection failed:', error.message);
    setTimeout(() => connect(port), 3000);
  }
};

const initRemoteDebugger = (options = {}) => {
  // 只在开发环境启用
  if (!__DEV__) {
    return {
      disconnect: () => { }
    };
  }

  const { port = 8989, enableConsole = true, enableNetwork = true } = options;

  if (enableConsole) {
    setupConsoleInterceptor();
  }

  if (enableNetwork) {
    setupNetworkInterceptor();
  }

  connect(port);

  return {
    disconnect: () => {
      if (ws) {
        ws.close();
      }
    }
  };
};

export default initRemoteDebugger;
