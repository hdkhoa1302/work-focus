// main/main.ts - entry Electron Main Process
import * as dotenv from 'dotenv';
import { connectDB } from './db';
import { setupAPI } from './api';
import { app, BrowserWindow, Tray, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { setupTimer } from './timer';
import { notificationManager } from './notification';
import { setupInactivityTracker, updateLastActivityTime, setCurrentUser, destroyInactivityTracker } from './inactivity';
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

  // Handle notification acknowledgment
  ipcMain.on('acknowledge-notification', (event, notificationId) => {
    notificationManager.acknowledgeNotification(notificationId);
  });

  // Handle periodic check triggers from renderer
  ipcMain.on('check-overdue-tasks', async (event) => {
    // Prevent loop - don't send message back to renderer
    // The periodic checks in main process will handle this
    console.log('Received check-overdue-tasks request - handled by main process periodic checks');
  });

  ipcMain.on('check-upcoming-deadlines', async (event) => {
    // Prevent loop - don't send message back to renderer
    console.log('Received check-upcoming-deadlines request - handled by main process periodic checks');
  });

  ipcMain.on('check-project-deadlines', async (event) => {
    // Prevent loop - don't send message back to renderer
    console.log('Received check-project-deadlines request - handled by main process periodic checks');
  });

  ipcMain.on('check-workload-warnings', async (event) => {
    // Prevent loop - don't send message back to renderer
    console.log('Received check-workload-warnings request - handled by main process periodic checks');
  });

  ipcMain.on('check-inactivity', async (event) => {
    // Prevent loop - don't send message back to renderer
    console.log('Received check-inactivity request - handled by main process periodic checks');
  });

  // Track user activity
  ipcMain.on('user-activity', (event) => {
    updateLastActivityTime();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupTimer(tray);
  setupInactivityTracker();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    notificationManager.destroy();
    destroyInactivityTracker();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
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

// Handle user login
ipcMain.on('user-logged-in', (event, args: { userId: string }) => {
  setCurrentUser(args.userId);
  updateLastActivityTime();
});