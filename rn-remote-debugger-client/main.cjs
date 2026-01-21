const { app, BrowserWindow, ipcMain } = require('electron');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const PORT = 8989;
const isDev = !app.isPackaged;
const VITE_DEV_SERVER = 'http://localhost:5173';
let mainWindow;

const server = http.createServer((req, res) => {
  res.writeHead(404);
  res.end('Use Vite dev server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  ws.on('message', (message) => {
    const messageStr = message.toString();

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
