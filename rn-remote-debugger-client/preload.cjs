const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  toggleDevTools: () => ipcRenderer.send('toggle-devtools')
});
