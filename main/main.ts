// main/main.ts - entry Electron Main Process
import * as dotenv from 'dotenv';
import { connectDB } from './db';
import { setupAPI } from './api';
import { app, BrowserWindow, Tray, nativeImage } from 'electron';
import * as path from 'path';
import { setupTimer } from './timer';

// Load env và khởi DB/API
dotenv.config();
(async () => {
  await connectDB();
  setupAPI();
})();

let tray: Tray;
function createTray() {
  const iconPath = path.join(__dirname, 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('FocusTrack');
}

function createWindow() {
  const isDev = process.env.NODE_ENV !== 'production';
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  const indexPath = path.join(__dirname, 'renderer', 'index.html');
  win.loadFile(indexPath);
  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupTimer(tray);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 