import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationConfig,
} from '../types/notification';

interface NotificationState {
  notifications: Notification[];
  config: NotificationConfig;
  unreadCount: number;
  lastActivityTime: Date | null;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  setNotifications: (notifications: Notification[]) => void;
  
  // Config Actions
  setConfig: (config: NotificationConfig) => void;
  fetchConfig: () => Promise<void>;
  updateConfig: (newConfig: Partial<NotificationConfig>) => Promise<void>;
  
  // Activity tracking
  updateActivityTime: () => void;
  checkInactivity: () => void;
  
  // Internal functions
  _hydrate: () => void;
  _recalculateUnread: () => void;
  _setupIpcListeners: () => void;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  lastActivityTime: new Date(),
  config: { // Default config, will be overwritten by fetchConfig
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
      inactivityWarning: true,
    },
    checkInterval: 5,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    inactivityThreshold: 4,
  },
  
  _recalculateUnread: () => {
    const unreadCount = get().notifications.filter(n => !n.read).length;
    set({ unreadCount });
  },

  addNotification: (notificationData) => {
    const newNotification: Notification = {
      ...notificationData,
      id: uuidv4(),
      timestamp: new Date(),
      read: false,
    };

    set(state => ({ notifications: [newNotification, ...state.notifications] }));
    get()._recalculateUnread();
    
    // Persist to localStorage
    const currentState = get().notifications;
    localStorage.setItem('notifications', JSON.stringify(currentState));

    // Send to main process for OS notification if needed
    const config = get().config;
    if (config.enabled && 
        config.osNotifications && 
        config.types[newNotification.type] && 
        (newNotification.priority === 'high' || newNotification.priority === 'critical')) {
      window.ipc?.send('show-notification', newNotification);
    }
  },

  markAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    get()._recalculateUnread();
    localStorage.setItem('notifications', JSON.stringify(get().notifications));
  },

  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    }));
    get()._recalculateUnread();
    localStorage.setItem('notifications', JSON.stringify(get().notifications));
  },

  deleteNotification: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
    get()._recalculateUnread();
    localStorage.setItem('notifications', JSON.stringify(get().notifications));
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
    localStorage.setItem('notifications', JSON.stringify([]));
  },

  setNotifications: (notifications) => {
    set({ notifications });
    get()._recalculateUnread();
  },
  
  setConfig: (config) => set({ config }),
  
  fetchConfig: async () => {
    try {
      const config = await window.ipc?.invoke('get-notification-config');
      if (config) {
        set({ config });
      }
    } catch (error) {
      console.error("Failed to fetch notification config:", error);
    }
  },

  updateConfig: async (newConfig) => {
    const currentConfig = get().config;
    const updatedConfig = { ...currentConfig, ...newConfig };
    set({ config: updatedConfig });
    await window.ipc?.invoke('update-notification-config', updatedConfig);
  },
  
  updateActivityTime: () => {
    const now = new Date();
    set({ lastActivityTime: now });
    
    // Also send to main process
    window.ipc?.send('user-activity');
    
    // Save to localStorage for persistence
    localStorage.setItem('lastActivityTime', now.toISOString());
  },
  
  checkInactivity: () => {
    const { lastActivityTime, config } = get();
    if (!lastActivityTime) return;
    
    const now = new Date();
    const diffMs = now.getTime() - lastActivityTime.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // Check if inactive for more than 25 minutes (Pomodoro length)
    if (diffMinutes >= 25) {
      // Check if we've already shown a notification recently
      const lastNotificationTime = localStorage.getItem('lastInactivityNotificationTime');
      if (lastNotificationTime) {
        const lastNotification = new Date(lastNotificationTime);
        const timeSinceLastNotification = (now.getTime() - lastNotification.getTime()) / (1000 * 60);
        
        // Only show notification once every 25 minutes
        if (timeSinceLastNotification < 25) {
          return;
        }
      }
      
      // Create inactivity notification
      get().addNotification({
        type: 'inactivityWarning',
        title: 'Cảnh báo không hoạt động',
        message: `Bạn đã không thực hiện phiên Pomodoro nào trong ${Math.floor(diffMinutes)} phút. Hãy bắt đầu một phiên tập trung để duy trì năng suất!`,
        priority: 'medium',
        actionRequired: true
      });
      
      // Save notification time
      localStorage.setItem('lastInactivityNotificationTime', now.toISOString());
    }
  },
  
  _hydrate: () => {
    try {
      // Load notifications
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        const notifications = JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        set({ notifications });
        get()._recalculateUnread();
      }
      
      // Load last activity time
      const lastActivityTime = localStorage.getItem('lastActivityTime');
      if (lastActivityTime) {
        set({ lastActivityTime: new Date(lastActivityTime) });
      }
    } catch (error) {
      console.error("Failed to hydrate notifications from localStorage:", error);
    }
  },

  _setupIpcListeners: () => {
    if (!window.ipc) return;

    // Listen for OS notification actions
    window.ipc.on('notification-action', (event, data) => {
      const { notification, action } = data;
      
      // Handle the action and forward to main process
      window.ipc?.send('handle-notification-action', { notification, action });
      
      // Mark notification as read since user interacted with it
      const store = get();
      const existingNotification = store.notifications.find(n => n.id === notification.id);
      if (existingNotification) {
        store.markAsRead(notification.id);
      }
    });

    // Listen for navigation events from main process
    window.ipc.on('navigate-to-task', (event, taskId) => {
      // This would be handled by the main app component
      console.log('Navigate to task:', taskId);
    });

    window.ipc.on('navigate-to-project', (event, projectId) => {
      // This would be handled by the main app component
      console.log('Navigate to project:', projectId);
    });

    window.ipc.on('navigate-to-schedule', (event) => {
      // This would be handled by the main app component
      console.log('Navigate to schedule');
    });

    window.ipc.on('complete-task', (event, taskId) => {
      // This would be handled by the main app component
      console.log('Complete task:', taskId);
    });

    // Listen for check-inactivity events
    window.ipc.on('check-inactivity', () => {
      get().checkInactivity();
    });
  },
}));

// Initial hydration from localStorage
useNotificationStore.getState()._hydrate();
// Initial fetch of config from main process
useNotificationStore.getState().fetchConfig();
// Setup IPC listeners
useNotificationStore.getState()._setupIpcListeners();

// Set up periodic inactivity checks
if (typeof window !== 'undefined') {
  // Check for inactivity every 5 minutes
  setInterval(() => {
    useNotificationStore.getState().checkInactivity();
  }, 5 * 60 * 1000);
  
  // Set up activity tracking
  const updateActivity = () => {
    useNotificationStore.getState().updateActivityTime();
  };
  
  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('click', updateActivity);
  
  // Initial activity update
  updateActivity();
}

export default useNotificationStore;