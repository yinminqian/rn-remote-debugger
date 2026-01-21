const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8989;

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ needle2020 connected');

  ws.on('message', (message) => {
    // 转换 Buffer 为字符串
    const messageStr = message.toString();

    // 转发给所有其他客户端
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ needle2020 disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Remote Console Debugger running on:`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Browser:   http://localhost:${PORT}`);
  console.log(`\n📱 Start needle2020 app to see logs here`);
});
