import { Notification, nativeImage } from 'electron';
import * as path from 'path';

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
  };
  checkInterval: number; // minutes
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
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
      system: true
    },
    checkInterval: 5,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };

  private checkInterval: NodeJS.Timeout | null = null;
  private lastChecks: Record<string, Date> = {};

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
    if (!this.shouldShowNotification(notification.type)) return;

    // Add to in-app notification system
    this.addToInAppNotifications(notification);

    // Show OS notification if enabled
    if (this.config.osNotifications && Notification.isSupported()) {
      await this.showOSNotification(notification);
    }

    // Play sound if enabled
    if (this.config.sound) {
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
      const iconPath = path.join(__dirname, '..', 'assets', 'notification-icon.png');
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
    // This would integrate with your task API
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('check-overdue-tasks');
    }
  }

  private async checkUpcomingDeadlines() {
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('check-upcoming-deadlines');
    }
  }

  private async checkProjectDeadlines() {
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('check-project-deadlines');
    }
  }

  private async checkWorkloadWarnings() {
    const mainWindow = require('electron').BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send('check-workload-warnings');
    }
  }

  public destroy() {
    this.stopPeriodicChecks();
  }
}

export const notificationManager = new NotificationManager();