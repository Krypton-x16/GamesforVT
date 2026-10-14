const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', { quit: () => ipcRenderer.send('game:quit'), fullscreen: () => ipcRenderer.send('game:fullscreen') });
