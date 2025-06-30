// main/main.ts - entry Electron Main Process
import * as dotenv from 'dotenv';
import { connectDB } from './db';
import { setupAPI } from './api';
import { app, BrowserWindow, Tray, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { setupTimer, setCurrentUserId } from './timer';
import { notificationManager } from './notification';
import { setupInactivityTracker, updateLastActivityTime, setCurrentUser, destroyInactivityTracker } from './inactivity';
import psList from 'ps-list';

// Safe logging function to prevent EIO errors
const safeLog = (...args: any[]) => {
  try {
    console.log(...args);
  } catch (error) {
    // Ignore EIO errors when stdout is not available
    if ((error as any).code !== 'EIO') {
      console.error('Logging error:', error);
    }
  }
};

// Single instance protection - chỉ cho phép 1 instance của Work Focus
const gotTheLock = app.requestSingleInstanceLock();

safeLog(`🔒 Single instance lock: ${gotTheLock ? 'GOT LOCK' : 'NO LOCK'}`);

if (!gotTheLock) {
  console.log('🚫 Work Focus đã đang chạy. Đóng instance cũ...');
  app.quit();
  process.exit(0); // Force exit to prevent any further execution
} else {
  console.log('✅ Đây là instance chính - tiếp tục khởi động');
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    console.log('🔄 Phát hiện instance thứ 2, focus vào window hiện tại...');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  
  // Thêm debugging cho app lifecycle
  app.on('before-quit', (event) => {
    console.log('🛑 App before-quit event triggered');
  });
  
  app.on('will-quit', (event) => {
    console.log('🛑 App will-quit event triggered');
  });
  
  app.on('window-all-closed', () => {
    console.log('🛑 All windows closed');
    if (process.platform !== 'darwin') {
      notificationManager.destroy();
      destroyInactivityTracker();
      app.quit();
    }
  });
}

// Load biến môi trường từ .env (hỗ trợ khi đóng gói)
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Load env và khởi DB/API
let apiInitialized = false;

(async () => {
  try {
    // Debug environment variables
    console.log('🔍 Environment Debug:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   USE_LOCAL_API: ${process.env.USE_LOCAL_API}`);
    console.log(`   isPackaged: ${app.isPackaged}`);
    
    // Import API config
    const { getAPIConfig, setRemoteAPI } = await import('./config/api-config');
    
    // Kiểm tra nếu cần sử dụng local API
    if (process.env.USE_LOCAL_API === 'true') {
      console.log('🔧 Khởi động local API server...');
      try {
        await connectDB();
        console.log('✅ Database connected, starting API server...');
        
        const apiResult = await setupAPI();
        console.log('✅ API setup result:', apiResult);
        
        if (apiResult.isReusing) {
          console.log('🔄 Sử dụng lại Work Focus API service đang chạy');
        } else {
          console.log(`🚀 Local API service khởi động thành công tại port ${apiResult.port}`);
        }
        
        // Store callback to notify renderer when window is ready
        (global as any).notifyRendererApiConfig = () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const updatedConfig = getAPIConfig();
            console.log('📡 Notifying renderer about API config update:', updatedConfig);
            mainWindow.webContents.send('api-config-updated', { baseUrl: updatedConfig.baseUrl });
          }
        };
        
        apiInitialized = true;
        console.log('✅ API initialization completed successfully');
      } catch (apiError) {
        console.error('❌ Lỗi khởi tạo local API:', apiError);
        console.log('🌐 Fallback to remote API due to local API error');
        setRemoteAPI();
        apiInitialized = true;
      }
    } else {
      console.log('🌐 Sử dụng remote API - bỏ qua khởi động local server');
      setRemoteAPI();
      
      // Test remote API connection
      try {
        const axios = await import('axios');
        const response = await axios.default.get('https://work-focus-api.vercel.app/api/health', {
          timeout: 10000 // 10s timeout
        });
        console.log('✅ Remote API connection successful:', response.data);
      } catch (error) {
        console.warn('⚠️ Không thể kết nối remote API:', error);
        console.log('💡 App vẫn có thể hoạt động, user sẽ thấy lỗi connection trong UI');
      }
      
      apiInitialized = true;
    }
  } catch (error) {
    console.error('❌ Lỗi khởi tạo API:', error);
    // Fallback to remote API
    try {
      const { setRemoteAPI } = await import('./config/api-config');
      setRemoteAPI();
      console.log('🌐 Fallback to remote API due to initialization error');
    } catch (fallbackError) {
      console.error('❌ Fallback cũng thất bại:', fallbackError);
    }
    apiInitialized = true;
  }
})();

// Tự động reload Electron khi có thay đổi file trong thư mục dist/main (chỉ khi development thực sự)
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// TEMPORARY DISABLE electron-reload để fix vấn đề reload liên tục
console.log('🚫 electron-reload DISABLED để debug reload issue');
console.log(`📊 Environment: NODE_ENV=${process.env.NODE_ENV}, isDev=${isDev}, gotTheLock=${gotTheLock}, isPackaged=${app.isPackaged}`);

// Chỉ enable electron-reload khi thực sự đang development và không phải npm start
// Và không có instance khác đang chạy
if (false) { // DISABLED temporarily
  try {
    console.log('🔄 Enabling electron-reload for development...');
    require('electron-reload')(__dirname, {
      electron: process.execPath,
      awaitWriteFinish: true,
      // Chỉ watch .js files, không watch build artifacts
      ignored: /node_modules|\.git|\.DS_Store|\.map$|package\.json$/
    });
  } catch (err) {
    console.log('electron-reload not available or disabled:', (err as Error).message);
  }
} else {
  console.log('🚫 electron-reload disabled (production mode, npm start, or multiple instances)');
}

let tray: Tray;
let mainWindow: BrowserWindow | null = null;

function createTray() {
  const iconPath = path.join(__dirname, 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('FocusTrack');
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const winOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1024,
    height: 768,
    backgroundColor: '#262835',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  };
  if (process.platform === 'darwin') {
    winOptions.titleBarStyle = 'hiddenInset';
  } else {
    winOptions.titleBarOverlay = {
      color: '#262835',
      symbolColor: '#ffffff',
    };
  }
  const win = new BrowserWindow(winOptions);
  const indexPath = path.join(__dirname, 'renderer', 'index.html');
  win.loadFile(indexPath);
  if (isDev) {
    win.webContents.openDevTools();
  }

  mainWindow = win;
  
  // Notify renderer about API config if callback exists
  if ((global as any).notifyRendererApiConfig) {
    // Wait for window to be ready before sending
    win.webContents.once('did-finish-load', () => {
      (global as any).notifyRendererApiConfig();
    });
  }
  
  return win;
}

// Setup notification IPC handlers - chỉ gọi một lần khi app khởi động
function setupNotificationHandlers() {
  // Handle notification config updates
  ipcMain.handle('update-notification-config', (event, config) => {
    notificationManager.updateConfig(config);
  });

  // Handle notification config requests
  ipcMain.handle('get-notification-config', (event) => {
    return notificationManager.getConfig();
  });

  // Handle manual notification triggers
  ipcMain.on('show-notification', (event, notification) => {
    notificationManager.showNotification(notification);
  });

  // Handle notification acknowledgment
  ipcMain.on('acknowledge-notification', (event, notificationId) => {
    notificationManager.acknowledgeNotification(notificationId);
  });

  // Handle notification action events from OS notifications
  ipcMain.on('handle-notification-action', (event, data) => {
    const { notification, action } = data;
    
    // Forward the action to the appropriate handler - sử dụng mainWindow thay vì win parameter
    switch (action) {
      case 'xem task':
      case 'view task':
        mainWindow?.webContents.send('navigate-to-task', notification.data?.relatedId);
        break;
      case 'hoàn thành':
      case 'complete':
        mainWindow?.webContents.send('complete-task', notification.data?.relatedId);
        break;
      case 'snooze':
        // Re-schedule notification for later
        setTimeout(() => {
          notificationManager.showNotification({
            ...notification,
            id: `${notification.id}-snoozed`,
            title: notification.title + ' (Snoozed)',
            timestamp: new Date()
          });
        }, 10 * 60 * 1000); // 10 minutes
        break;
      case 'xem dự án':
      case 'view project':
        mainWindow?.webContents.send('navigate-to-project', notification.data?.relatedId);
        break;
      case 'đã biết':
      case 'acknowledged':
        notificationManager.acknowledgeNotification(notification.id);
        break;
      case 'xem lịch':
      case 'view schedule':
        mainWindow?.webContents.send('navigate-to-schedule');
        break;
      case 'bỏ qua':
      case 'dismiss':
      case 'ok':
      case 'tuyệt vời!':
        notificationManager.acknowledgeNotification(notification.id);
        break;
    }
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

app.whenReady().then(async () => {
  // Setup IPC handlers một lần duy nhất khi app khởi động
  setupNotificationHandlers();
  
  // Đợi API initialization hoàn tất
  if (process.env.USE_LOCAL_API === 'true') {
    console.log('⏳ Đợi API initialization hoàn tất...');
    let attempts = 0;
    while (!apiInitialized && attempts < 50) { // Max 10s wait
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
    
    if (!apiInitialized) {
      console.warn('⚠️ API initialization timeout, proceeding anyway');
    } else {
      console.log('✅ API initialization confirmed, creating window');
    }
  }
  
  createWindow();
  createTray();
  setupTimer(tray);
  setupInactivityTracker();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const win = createWindow();
    mainWindow = win;
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
  setCurrentUserId(args.userId); // Also set in timer
  updateLastActivityTime();
});

// Handle API config requests
ipcMain.handle('get-api-config', () => {
  const { getAPIConfig } = require('./config/api-config');
  const apiConfig = getAPIConfig();
  return {
    baseUrl: apiConfig.baseUrl
  };
});

// Handle synchronous API config requests for initial setup
ipcMain.on('get-api-config-sync', (event) => {
  const { getAPIConfig } = require('./config/api-config');
  const apiConfig = getAPIConfig();
  console.log('🔍 IPC get-api-config-sync called, returning:', apiConfig);
  event.returnValue = { baseUrl: apiConfig.baseUrl };
});