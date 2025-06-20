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
  
  // Internal functions
  _hydrate: () => void;
  _recalculateUnread: () => void;
  _setupIpcListeners: () => void;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
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
  
  _hydrate: () => {
    try {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        const notifications = JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        set({ notifications });
        get()._recalculateUnread();
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

    // Listen for new notifications from main process
    // DISABLED TO PREVENT INFINITE LOOP - renderer handles notifications directly
    /*
    window.ipc.on('new-notification', (event, notification) => {
      const store = get();
      store.addNotification(notification);
    });
    */
  },
}));

// Initial hydration from localStorage
useNotificationStore.getState()._hydrate();
// Initial fetch of config from main process
useNotificationStore.getState().fetchConfig();
// Setup IPC listeners
useNotificationStore.getState()._setupIpcListeners();

export default useNotificationStore; 