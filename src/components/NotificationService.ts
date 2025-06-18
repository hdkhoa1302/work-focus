// Notification Service - Utility for managing notifications across the app

export interface Notification {
  id: string;
  type: 'overdue' | 'upcoming' | 'ot' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  relatedId?: string;
  relatedType?: 'task' | 'project';
  actionRequired?: boolean;
}

// Add a new notification
export const addNotification = (notification: Notification): void => {
  // Load existing notifications
  const savedNotifications = localStorage.getItem('notifications');
  let notifications: Notification[] = [];
  
  if (savedNotifications) {
    notifications = JSON.parse(savedNotifications).map((n: any) => ({
      ...n,
      timestamp: new Date(n.timestamp)
    }));
  }
  
  // Check if notification with this ID already exists
  const existingIndex = notifications.findIndex(n => n.id === notification.id);
  
  if (existingIndex >= 0) {
    // Update existing notification
    notifications[existingIndex] = {
      ...notification,
      timestamp: new Date() // Update timestamp
    };
  } else {
    // Add new notification
    notifications.unshift(notification);
  }
  
  // Save to localStorage
  localStorage.setItem('notifications', JSON.stringify(notifications));
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('new-notification', {
    detail: { notification }
  }));
};

// Mark a notification as read
export const markNotificationAsRead = (id: string): void => {
  const savedNotifications = localStorage.getItem('notifications');
  if (!savedNotifications) return;
  
  const notifications = JSON.parse(savedNotifications);
  const updatedNotifications = notifications.map((n: Notification) => 
    n.id === id ? { ...n, read: true } : n
  );
  
  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('notification-updated'));
};

// Mark all notifications as read
export const markAllNotificationsAsRead = (): void => {
  const savedNotifications = localStorage.getItem('notifications');
  if (!savedNotifications) return;
  
  const notifications = JSON.parse(savedNotifications);
  const updatedNotifications = notifications.map((n: Notification) => ({ ...n, read: true }));
  
  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('notification-updated'));
};

// Delete a notification
export const deleteNotification = (id: string): void => {
  const savedNotifications = localStorage.getItem('notifications');
  if (!savedNotifications) return;
  
  const notifications = JSON.parse(savedNotifications);
  const updatedNotifications = notifications.filter((n: Notification) => n.id !== id);
  
  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('notification-updated'));
};

// Clear all notifications
export const clearAllNotifications = (): void => {
  localStorage.setItem('notifications', JSON.stringify([]));
  
  // Dispatch event for real-time updates
  window.dispatchEvent(new CustomEvent('notification-updated'));
};

// Get all notifications
export const getAllNotifications = (): Notification[] => {
  const savedNotifications = localStorage.getItem('notifications');
  if (!savedNotifications) return [];
  
  return JSON.parse(savedNotifications).map((n: any) => ({
    ...n,
    timestamp: new Date(n.timestamp)
  }));
};

// Get unread count
export const getUnreadCount = (): number => {
  const notifications = getAllNotifications();
  return notifications.filter(n => !n.read).length;
};

// Create a task overdue notification
export const createTaskOverdueNotification = (
  taskId: string,
  taskTitle: string,
  daysOverdue: number,
  overtimeHours: number
): void => {
  const notification: Notification = {
    id: `task-overdue-${taskId}-${Date.now()}`,
    type: 'overdue',
    title: 'Task quá hạn',
    message: `Task "${taskTitle}" đã quá hạn ${daysOverdue} ngày. Cần ${overtimeHours.toFixed(1)} giờ OT để hoàn thành.`,
    timestamp: new Date(),
    read: false,
    priority: 'high',
    relatedId: taskId,
    relatedType: 'task',
    actionRequired: true
  };
  
  addNotification(notification);
};

// Create a project deadline notification
export const createProjectDeadlineNotification = (
  projectId: string,
  projectName: string,
  daysRemaining: number
): void => {
  const notification: Notification = {
    id: `project-deadline-${projectId}-${Date.now()}`,
    type: 'upcoming',
    title: 'Deadline dự án sắp đến',
    message: `Dự án "${projectName}" sẽ đến hạn trong ${daysRemaining} ngày.`,
    timestamp: new Date(),
    read: false,
    priority: daysRemaining <= 2 ? 'high' : 'medium',
    relatedId: projectId,
    relatedType: 'project'
  };
  
  addNotification(notification);
};

// Create a daily workload notification
export const createWorkloadNotification = (
  requiredMinutes: number,
  availableMinutes: number,
  overloadedMinutes: number
): void => {
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };
  
  const notification: Notification = {
    id: `workload-${Date.now()}`,
    type: 'ot',
    title: 'Quá tải công việc hôm nay',
    message: `Bạn cần ${formatMinutes(requiredMinutes)} để hoàn thành tất cả task, nhưng chỉ có ${formatMinutes(availableMinutes)} trong ngày. Thiếu ${formatMinutes(overloadedMinutes)}.`,
    timestamp: new Date(),
    read: false,
    priority: 'high',
    actionRequired: true
  };
  
  addNotification(notification);
};

// Create a system notification
export const createSystemNotification = (
  title: string,
  message: string,
  priority: 'high' | 'medium' | 'low' = 'medium'
): void => {
  const notification: Notification = {
    id: `system-${Date.now()}`,
    type: 'system',
    title,
    message,
    timestamp: new Date(),
    read: false,
    priority
  };
  
  addNotification(notification);
};