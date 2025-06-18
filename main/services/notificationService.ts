import { Notification, app } from 'electron';
import { logger } from '../utils/logger';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
  timeoutType?: 'default' | 'never';
}

class NotificationService {
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = Notification.isSupported();
    if (!this.isSupported) {
      logger.warn('System notifications are not supported on this platform');
    }
  }

  async show(options: NotificationOptions): Promise<void> {
    if (!this.isSupported) {
      logger.warn('Attempted to show notification on unsupported platform');
      return;
    }

    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon,
        silent: !options.sound,
        urgency: options.urgency || 'normal',
        timeoutType: options.timeoutType || 'default'
      });

      notification.on('click', () => {
        logger.info('Notification clicked', { title: options.title });
        // Focus the main window when notification is clicked
        const windows = require('electron').BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const mainWindow = windows[0];
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });

      notification.show();
      logger.info('Notification shown', { title: options.title });
    } catch (error) {
      logger.error('Failed to show notification', { error, options });
    }
  }

  async showPomodoroComplete(type: 'focus' | 'break'): Promise<void> {
    const options: NotificationOptions = {
      title: 'FocusTrack',
      body: type === 'focus' 
        ? '🎉 Focus session completed! Time for a break.' 
        : '⚡ Break time is over! Ready to focus again?',
      sound: true,
      urgency: 'normal'
    };

    await this.show(options);
  }

  async showTaskCompleted(taskTitle: string): Promise<void> {
    const options: NotificationOptions = {
      title: 'Task Completed! 🏆',
      body: `Great job completing "${taskTitle}"!`,
      sound: true,
      urgency: 'normal'
    };

    await this.show(options);
  }

  async showProjectCompleted(projectName: string): Promise<void> {
    const options: NotificationOptions = {
      title: 'Project Completed! 🎊',
      body: `Congratulations! You've completed the "${projectName}" project!`,
      sound: true,
      urgency: 'normal'
    };

    await this.show(options);
  }

  async showDailyGoalAchieved(pomodoroCount: number): Promise<void> {
    const options: NotificationOptions = {
      title: 'Daily Goal Achieved! 🌟',
      body: `Amazing! You've completed ${pomodoroCount} Pomodoro sessions today!`,
      sound: true,
      urgency: 'normal'
    };

    await this.show(options);
  }
}

export const notificationService = new NotificationService();