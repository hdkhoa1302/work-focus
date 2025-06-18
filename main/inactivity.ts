import { notificationManager } from './notification';
import { TaskModel } from './models/task';
import { SessionModel } from './models/session';

// Track the last activity time
let lastActivityTime: Date | null = null;
let inactivityCheckInterval: NodeJS.Timeout | null = null;
let currentUserId: string | undefined;

// Default inactivity threshold (in hours)
const DEFAULT_INACTIVITY_THRESHOLD = 4; // 4 hours

// Initialize the inactivity tracker
export function setupInactivityTracker() {
  // Set up interval to check for inactivity
  inactivityCheckInterval = setInterval(() => {
    checkInactivity();
  }, 15 * 60 * 1000); // Check every 15 minutes
}

// Update the last activity time when user performs an action
export function updateLastActivityTime() {
  lastActivityTime = new Date();
  
  // Save to persistent storage
  try {
    localStorage.setItem('lastActivityTime', lastActivityTime.toISOString());
  } catch (error) {
    console.error('Failed to save last activity time:', error);
  }
}

// Set the current user ID
export function setCurrentUser(userId: string) {
  currentUserId = userId;
  
  // Load last activity time from storage
  try {
    const savedTime = localStorage.getItem(`lastActivityTime_${userId}`);
    if (savedTime) {
      lastActivityTime = new Date(savedTime);
    } else {
      // If no saved time, set to current time
      lastActivityTime = new Date();
      localStorage.setItem(`lastActivityTime_${userId}`, lastActivityTime.toISOString());
    }
  } catch (error) {
    console.error('Failed to load last activity time:', error);
    lastActivityTime = new Date();
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
      const lastNotificationTime = localStorage.getItem(`lastInactivityNotification_${currentUserId}`);
      if (lastNotificationTime) {
        const lastNotification = new Date(lastNotificationTime);
        const timeSinceLastNotification = (now.getTime() - lastNotification.getTime()) / (1000 * 60 * 60);
        
        // Only notify once every threshold period
        if (timeSinceLastNotification < thresholdHours) {
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
      notificationManager.showNotification({
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
      localStorage.setItem(`lastInactivityNotification_${currentUserId}`, now.toISOString());
    }
  } catch (error) {
    console.error('Error checking inactivity:', error);
  }
}

// Get inactivity configuration
async function getInactivityConfig() {
  if (!currentUserId) return null;
  
  try {
    // This would typically come from your database
    // For now, we'll use a simple localStorage approach
    const configStr = localStorage.getItem(`inactivityConfig_${currentUserId}`);
    if (configStr) {
      return JSON.parse(configStr);
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