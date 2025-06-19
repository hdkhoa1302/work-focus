import { notificationManager } from './notification';
import { TaskModel } from './models/task';
import { SessionModel } from './models/session';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Track the last activity time
let lastActivityTime: Date | null = null;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let currentUserId: string | undefined;
let lastNotificationTime: Date | null = null;

// Default inactivity threshold (in hours)
const DEFAULT_INACTIVITY_THRESHOLD = 4; // 4 hours

// Get user data directory
function getUserDataPath(): string {
  return path.join(app.getPath('userData'), 'inactivity-data');
}

// Ensure directory exists
function ensureDataDirectory(): void {
  const dataPath = getUserDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
}

// Save data to file
function saveToFile(filename: string, data: any): void {
  try {
    ensureDataDirectory();
    const filePath = path.join(getUserDataPath(), filename);
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
  } catch (error) {
    console.error(`Failed to save ${filename}:`, error);
  }
}

// Load data from file
function loadFromFile(filename: string): any {
  try {
    ensureDataDirectory();
    const filePath = path.join(getUserDataPath(), filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Failed to load ${filename}:`, error);
  }
  return null;
}

// Initialize the inactivity tracker
export function setupInactivityTracker() {
  // TEMPORARILY DISABLE INACTIVITY CHECKS TO FIX LOOP
  console.log('Inactivity tracker DISABLED to prevent loop');
  return;
  
  // Set up interval to check for inactivity
  inactivityCheckInterval = setInterval(() => {
    checkInactivity();
  }, 15 * 60 * 1000); // Check every 15 minutes
}

// Update the last activity time when user performs an action
export function updateLastActivityTime() {
  lastActivityTime = new Date();
  
  // Save to persistent storage using file system
  if (currentUserId) {
    saveToFile(`lastActivityTime_${currentUserId}.json`, {
      timestamp: lastActivityTime.toISOString(),
      userId: currentUserId
    });
  } else {
    saveToFile('lastActivityTime.json', {
      timestamp: lastActivityTime.toISOString()
    });
  }
}

// Set the current user ID
export function setCurrentUser(userId: string) {
  currentUserId = userId;
  
  // Load last activity time from storage
  const savedData = loadFromFile(`lastActivityTime_${userId}.json`);
  if (savedData && savedData.timestamp) {
    lastActivityTime = new Date(savedData.timestamp);
  } else {
    // If no saved time, set to current time
    lastActivityTime = new Date();
    updateLastActivityTime();
  }
  
  // Load last notification time
  const lastNotificationData = loadFromFile(`lastInactivityNotification_${userId}.json`);
  if (lastNotificationData && lastNotificationData.timestamp) {
    lastNotificationTime = new Date(lastNotificationData.timestamp);
  }
}

// Check for inactivity
async function checkInactivity() {
  if (!lastActivityTime || !currentUserId) return;
  
  try {
    // Get inactivity threshold from config or use default
    const config = await getInactivityConfig();
    const thresholdHours = config?.inactivityThreshold || DEFAULT_INACTIVITY_THRESHOLD;
    
    const now = new Date();
    const diffMs = now.getTime() - lastActivityTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Check if user has been inactive for longer than the threshold
    if (diffHours >= thresholdHours) {
      // Check if we've already notified for this inactivity period
      // Add debouncing to prevent spam
      if (lastNotificationTime) {
        const timeSinceLastNotification = (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);
        
        // Only notify once every threshold period (minimum 4 hours between notifications)
        if (timeSinceLastNotification < Math.max(thresholdHours, 4)) {
          return;
        }
      }
      
      // Get pending tasks for context
      const pendingTasks = await TaskModel.find({ 
        userId: currentUserId,
        status: { $ne: 'done' }
      }).sort({ priority: -1 }).limit(3);
      
      // Get today's sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySessions = await SessionModel.countDocuments({
        userId: currentUserId,
        type: 'focus',
        startTime: { $gte: today }
      });
      
      // Create notification message
      let notificationBody = `Bạn đã không thực hiện phiên Pomodoro nào trong ${Math.floor(diffHours)} giờ qua.`;
      
      if (pendingTasks.length > 0) {
        notificationBody += ` Bạn có ${pendingTasks.length} công việc đang chờ xử lý.`;
        if (pendingTasks[0]) {
          notificationBody += ` Ưu tiên cao nhất: "${pendingTasks[0].title}"`;
        }
      }
      
      if (todaySessions === 0) {
        notificationBody += " Bạn chưa có phiên Pomodoro nào hôm nay.";
      }
      
      // Show notification
      await notificationManager.showNotification({
        id: `inactivity-warning-${Date.now()}`,
        type: 'inactivityWarning',
        title: 'Cảnh báo không hoạt động',
        body: notificationBody,
        priority: 'high',
        timestamp: new Date(),
        requiresConfirmation: true,
        data: {
          inactiveSince: lastActivityTime,
          inactiveHours: Math.floor(diffHours),
          pendingTasks: pendingTasks.map(t => ({ id: t._id, title: t.title }))
        }
      });
      
      // Save notification time
      lastNotificationTime = now;
      saveToFile(`lastInactivityNotification_${currentUserId}.json`, {
        timestamp: now.toISOString(),
        userId: currentUserId
      });
    }
  } catch (error) {
    console.error('Error checking inactivity:', error);
  }
}

// Get inactivity configuration
async function getInactivityConfig() {
  if (!currentUserId) return null;
  
  try {
    // Load config from file system
    const config = loadFromFile(`inactivityConfig_${currentUserId}.json`);
    if (config) {
      return config;
    }
    
    // Default config
    return {
      inactivityThreshold: DEFAULT_INACTIVITY_THRESHOLD,
      enabled: true
    };
  } catch (error) {
    console.error('Error getting inactivity config:', error);
    return null;
  }
}

// Clean up resources
export function destroyInactivityTracker() {
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
  }
}