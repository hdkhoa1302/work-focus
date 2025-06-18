// main/main.ts - entry Electron Main Process
import * as dotenv from 'dotenv';
import { connectDB } from './db';
import { setupAPI } from './api';
import { app, BrowserWindow, Tray, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { setupTimer } from './timer';
import { notificationManager } from './notification';
import psList from 'ps-list';

// Load env và khởi DB/API
dotenv.config();
(async () => {
  await connectDB();
  setupAPI();
})();

// Tự động reload Electron khi có thay đổi file trong thư mục dist/main (chỉ dev mode)
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: process.execPath,
      awaitWriteFinish: true,
    });
  } catch (err) {
    console.log('electron-reload not available in production');
  }
}

let tray: Tray;
function createTray() {
  const iconPath = path.join(__dirname, 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('FocusTrack');
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
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

  // Setup notification IPC handlers
  setupNotificationHandlers(win);
}

function setupNotificationHandlers(win: BrowserWindow) {
  // Handle notification config updates
  ipcMain.on('update-notification-config', (event, config) => {
    notificationManager.updateConfig(config);
  });

  // Handle notification config requests
  ipcMain.on('get-notification-config', (event) => {
    event.reply('notification-config', notificationManager.getConfig());
  });

  // Handle manual notification triggers
  ipcMain.on('show-notification', (event, notification) => {
    notificationManager.showNotification(notification);
  });

  // Handle periodic check triggers from renderer
  ipcMain.on('check-overdue-tasks', async (event) => {
    // This would be implemented to check for overdue tasks
    // and send notifications back to renderer
  });

  ipcMain.on('check-upcoming-deadlines', async (event) => {
    // Check for upcoming deadlines
  });

  ipcMain.on('check-project-deadlines', async (event) => {
    // Check for project deadlines
  });

  ipcMain.on('check-workload-warnings', async (event) => {
    // Check for workload warnings
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupTimer(tray);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    notificationManager.destroy();
    app.quit();
  }
});

// IPC handler để lấy danh sách ứng dụng đang chạy
ipcMain.on('get-running-apps', async (event) => {
  try {
    const processes = await psList();
    const names = Array.from(new Set(processes.map(p => p.name))).sort();
    event.sender.send('running-apps-response', names);
  } catch (err) {
    console.error('Error fetching running apps:', err);
    event.sender.send('running-apps-response', []);
  }
});