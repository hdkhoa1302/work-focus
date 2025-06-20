export interface Notification {
  id: string;
  type: 'overdue' | 'upcoming' | 'ot' | 'system' | 'achievement' | 'pomodoroComplete' | 'breakComplete' | 'taskDeadline' | 'projectDeadline' | 'workloadWarning' | 'inactivityWarning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low' | 'critical';
  relatedId?: string;
  relatedType?: 'task' | 'project';
  actionRequired?: boolean;
}

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