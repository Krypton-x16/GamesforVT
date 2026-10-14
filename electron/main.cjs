const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
app.setName('Sector09');
let win;
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ width: 1440, height: 900, minWidth: 960, minHeight: 640, backgroundColor: '#101b25', title: 'Сектор 09', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  if (!app.isPackaged && process.env.SECTOR09_DEV_URL) win.loadURL(process.env.SECTOR09_DEV_URL);
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.once('ready-to-show', () => { if (!process.env.SECTOR09_TEST) win.show(); });
  ipcMain.on('game:quit', () => app.quit());
  ipcMain.on('game:fullscreen', () => win.setFullScreen(!win.isFullScreen()));
});
app.on('window-all-closed', () => app.quit());
