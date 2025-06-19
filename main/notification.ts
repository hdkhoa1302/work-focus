import { Notification, nativeImage } from 'electron';
import * as path from 'path';
import nodeNotifier from 'node-notifier';

export interface NotificationConfig {
  enabled: boolean;
  sound: boolean;
  osNotifications: boolean;
  types: {
    taskOverdue: boolean;
    taskDeadline: boolean;
    projectDeadline: boolean;
    workloadWarning: boolean;
    pomodoroComplete: boolean;
    breakComplete: boolean;
    achievement: boolean;
    system: boolean;
    inactivityWarning: boolean;
  };
  checkInterval: number; // minutes
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
  inactivityThreshold: number; // hours
}

export interface NotificationData {
  id: string;
  type: keyof NotificationConfig['types'];
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
  timestamp: Date;
  requiresConfirmation?: boolean;
}

class NotificationManager {
  private config: NotificationConfig = {
    enabled: true,
    sound: true,
    osNotifications: true,
    types: {
      taskOverdue: true,
      taskDeadline: true,
      projectDeadline: true,
      workloadWarning: true,
      pomodoroComplete: true,
      breakComplete: true,
      achievement: true,
      system: true,
      inactivityWarning: true
    },
    checkInterval: 5,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    inactivityThreshold: 4 // 4 hours
  };

  private checkInterval: NodeJS.Timeout | null = null;
  private lastChecks: Record<string, Date> = {};
  private acknowledgedNotifications: Set<string> = new Set();
  private lastNotificationTimes: Map<string, Date> = new Map();

  constructor() {
    this.loadConfig();
    this.startPeriodicChecks();
  }

  private loadConfig() {
    try {
      const savedConfig = localStorage.getItem('notificationConfig');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load notification config:', error);
    }
  }

  private saveConfig() {
    try {
      localStorage.setItem('notificationConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save notification config:', error);
    }
  }

  public updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // Restart periodic checks if interval changed
    if (newConfig.checkInterval) {
      this.stopPeriodicChecks();
      this.startPeriodicChecks();
    }
  }

  public getConfig(): NotificationConfig {
    return { ...this.config };
  }

  private isQuietTime(): boolean {
    if (!this.config.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.config.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  private shouldShowNotification(type: keyof NotificationConfig['types']): boolean {
    if (!this.config.enabled) return false;
    if (!this.config.types[type]) return false;
    if (this.isQuietTime()) return false;
    
    return true;
  }

  public async showNotification(notification: NotificationData): Promise<void> {
    console.log(`[NOTIFICATION DEBUG] Attempting to show: ${notification.type} - ${notification.title}`);
    console.log(`[NOTIFICATION DEBUG] Call stack:`, new Error().stack?.split('\n').slice(1, 5));
    
    if (!this.shouldShowNotification(notification.type)) {
      console.log(`[NOTIFICATION DEBUG] Blocked by config for type: ${notification.type}`);
      return;
    }

    // Check if this notification has been acknowledged
    if (this.acknowledgedNotifications.has(notification.id)) {
      console.log(`[NOTIFICATION DEBUG] Already acknowledged: ${notification.id}`);
      return;
    }

    // Rate limiting - prevent too many notifications of same type
    const now = new Date();
    const notificationKey = `${notification.type}-${notification.title}`;
    const lastShown = this.lastNotificationTimes?.get(notificationKey);
    
    if (lastShown) {
      const timeSinceLastShown = now.getTime() - lastShown.getTime();
      // Minimum 30 seconds between similar notifications
      if (timeSinceLastShown < 30 * 1000) {
        console.log(`[NOTIFICATION DEBUG] Rate limiting notification: ${notificationKey}`);
        return;
      }
    }

    // Update last shown time
    if (!this.lastNotificationTimes) {
      this.lastNotificationTimes = new Map();
    }
    this.lastNotificationTimes.set(notificationKey, now);

    console.log(`[NOTIFICATION DEBUG] Showing notification: ${notificationKey}`);

    // Add to in-app notification system
    this.addToInAppNotifications(notification);

    // Show OS notification if enabled
    if (this.config.osNotifications) {
      await this.showOSNotification(notification);
    }

    // Play sound if enabled
    if (this.config.sound) {
      console.log(`[NOTIFICATION DEBUG] Playing sound for: ${notification.priority}`);
      this.playNotificationSound(notification.priority);
    }
  }

  private addToInAppNotifications(notification: NotificationData) {
    // Send to renderer process
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('new-notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.body,
        timestamp: notification.timestamp,
        read: false,
        priority: notification.priority,
        relatedId: notification.data?.relatedId,
        relatedType: notification.data?.relatedType,
        actionRequired: notification.requiresConfirmation
      });
    }
  }

  private async showOSNotification(notification: NotificationData): Promise<void> {
    try {
      // Try to use Electron's native notification first
      if (Notification.isSupported()) {
        const iconPath = path.join(__dirname, '..', '..', 'assets', 'notification-icon.png');
        const icon = nativeImage.createFromPath(iconPath);
        
        const osNotification = new Notification({
          title: notification.title,
          body: notification.body,
          icon: icon.isEmpty() ? undefined : icon,
          urgency: this.getOSUrgency(notification.priority),
          silent: !this.config.sound,
          timeoutType: notification.priority === 'critical' ? 'never' : 'default'
        });

        osNotification.on('click', () => {
          // Focus the main window
          const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            
            // Send click event to renderer
            mainWindow.webContents.send('notification-clicked', notification);
          }
        });

        osNotification.show();
      } else {
        // Fallback to node-notifier for cross-platform support
        nodeNotifier.notify({
          title: notification.title,
          message: notification.body,
          icon: path.join(__dirname, '..', '..', 'assets', 'notification-icon.png'),
          sound: this.config.sound,
          wait: true, // Wait for user interaction
          timeout: notification.priority === 'critical' ? false : 10
        }, (err, response) => {
          if (err) console.error('Error showing OS notification:', err);
          
          // Handle click
          if (response === 'clicked') {
            const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.focus();
              
              // Send click event to renderer
              mainWindow.webContents.send('notification-clicked', notification);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to show OS notification:', error);
    }
  }

  private getOSUrgency(priority: string): 'normal' | 'critical' | 'low' {
    switch (priority) {
      case 'critical': return 'critical';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  private playNotificationSound(priority: string) {
    // Different sounds for different priorities
    const soundFile = priority === 'critical' ? 'critical.wav' : 
                     priority === 'high' ? 'high.wav' : 'default.wav';
    
    // In a real implementation, you would play the sound file
    console.log(`Playing notification sound: ${soundFile}`);
  }

  private startPeriodicChecks() {
    if (this.checkInterval) return;
    
    // TEMPORARILY DISABLE PERIODIC CHECKS TO FIX LOOP
    console.log('Periodic notification checks DISABLED to prevent loop');
    return;
    
    const intervalMs = this.config.checkInterval * 60 * 1000;
    this.checkInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, intervalMs);
    
    // Perform initial check
    setTimeout(() => this.performPeriodicChecks(), 5000);
  }

  private stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async performPeriodicChecks() {
    try {
      const now = new Date();
      
      // Check for overdue tasks
      if (this.shouldCheckType('taskOverdue', now)) {
        await this.checkOverdueTasks();
        this.lastChecks.taskOverdue = now;
      }
      
      // Check for upcoming deadlines
      if (this.shouldCheckType('taskDeadline', now)) {
        await this.checkUpcomingDeadlines();
        this.lastChecks.taskDeadline = now;
      }
      
      // Check for project deadlines
      if (this.shouldCheckType('projectDeadline', now)) {
        await this.checkProjectDeadlines();
        this.lastChecks.projectDeadline = now;
      }
      
      // Check for workload warnings
      if (this.shouldCheckType('workloadWarning', now)) {
        await this.checkWorkloadWarnings();
        this.lastChecks.workloadWarning = now;
      }
      
      // Check for inactivity
      if (this.shouldCheckType('inactivityWarning', now)) {
        await this.checkInactivity();
        this.lastChecks.inactivityWarning = now;
      }
      
    } catch (error) {
      console.error('Error during periodic notification checks:', error);
    }
  }

  private shouldCheckType(type: string, now: Date): boolean {
    const lastCheck = this.lastChecks[type];
    if (!lastCheck) return true;
    
    const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
    const checkIntervalMs = this.config.checkInterval * 60 * 1000;
    
    return timeSinceLastCheck >= checkIntervalMs;
  }

  private async checkOverdueTasks() {
    // Instead of sending message to renderer, check directly here
    // This prevents infinite loop between main and renderer
    try {
      // For now, just log. In production, this would check database directly
      console.log('Checking for overdue tasks...');
      
      // TODO: Implement direct database check for overdue tasks
      // const overdueTasks = await TaskModel.find({ 
      //   deadline: { $lt: new Date() }, 
      //   status: { $ne: 'done' } 
      // });
      
      // Show notifications for overdue tasks
      // overdueTasks.forEach(task => {
      //   this.showNotification({
      //     id: `task-overdue-${task._id}`,
      //     type: 'taskOverdue',
      //     title: 'Task quá hạn',
      //     body: `Task "${task.title}" đã quá hạn`,
      //     priority: 'high',
      //     timestamp: new Date()
      //   });
      // });
      
    } catch (error) {
      console.error('Error checking overdue tasks:', error);
    }
  }

  private async checkUpcomingDeadlines() {
    try {
      console.log('Checking for upcoming deadlines...');
      // TODO: Implement direct database check for upcoming deadlines
    } catch (error) {
      console.error('Error checking upcoming deadlines:', error);
    }
  }

  private async checkProjectDeadlines() {
    try {
      console.log('Checking for project deadlines...');
      // TODO: Implement direct database check for project deadlines
    } catch (error) {
      console.error('Error checking project deadlines:', error);
    }
  }

  private async checkWorkloadWarnings() {
    try {
      console.log('Checking for workload warnings...');
      // TODO: Implement workload analysis
    } catch (error) {
      console.error('Error checking workload warnings:', error);
    }
  }

  private async checkInactivity() {
    try {
      console.log('Checking for inactivity...');
      // This is handled by the inactivity tracker
    } catch (error) {
      console.error('Error checking inactivity:', error);
    }
  }

  public acknowledgeNotification(notificationId: string) {
    this.acknowledgedNotifications.add(notificationId);
  }

  public destroy() {
    this.stopPeriodicChecks();
  }
}

export const notificationManager = new NotificationManager();