// Notification Service - Utility for managing notifications across the app

import useNotificationStore from '../stores/notificationStore';
import { Notification } from '../types/notification';

// Add a new notification
export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void => {
  useNotificationStore.getState().addNotification(notification);
};

// Create a task overdue notification
export const createTaskOverdueNotification = (
  taskId: string,
  taskTitle: string,
  daysOverdue: number,
  overtimeHours: number
): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'overdue',
    title: 'Task quá hạn',
    message: `Task "${taskTitle}" đã quá hạn ${daysOverdue} ngày. Cần ${overtimeHours.toFixed(1)} giờ OT để hoàn thành.`,
    priority: 'high',
    relatedId: taskId,
    relatedType: 'task',
    actionRequired: true
  };
  
  useNotificationStore.getState().addNotification(notification);
};

// Create a project deadline notification
export const createProjectDeadlineNotification = (
  projectId: string,
  projectName: string,
  daysRemaining: number
): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'projectDeadline',
    title: 'Deadline dự án sắp đến',
    message: `Dự án "${projectName}" sẽ đến hạn trong ${daysRemaining} ngày.`,
    priority: daysRemaining <= 2 ? 'high' : 'medium',
    relatedId: projectId,
    relatedType: 'project'
  };
  
  useNotificationStore.getState().addNotification(notification);
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
  
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'workloadWarning',
    title: 'Quá tải công việc hôm nay',
    message: `Bạn cần ${formatMinutes(requiredMinutes)} để hoàn thành tất cả task, nhưng chỉ có ${formatMinutes(availableMinutes)} trong ngày. Thiếu ${formatMinutes(overloadedMinutes)}.`,
    priority: 'high',
    actionRequired: true
  };
  
  useNotificationStore.getState().addNotification(notification);
};

// Create a system notification
export const createSystemNotification = (
  title: string,
  message: string,
  priority: 'high' | 'medium' | 'low' | 'critical' = 'medium'
): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'system',
    title,
    message,
    priority
  };
  
  useNotificationStore.getState().addNotification(notification);
};

// Create a pomodoro completion notification
export const createPomodoroCompleteNotification = (
  taskTitle?: string
): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'pomodoroComplete',
    title: 'Phiên Pomodoro hoàn thành',
    message: taskTitle 
      ? `Bạn đã hoàn thành phiên tập trung cho task "${taskTitle}". Hãy nghỉ ngơi!`
      : 'Bạn đã hoàn thành phiên tập trung. Hãy nghỉ ngơi!',
    priority: 'medium'
  };
  
  useNotificationStore.getState().addNotification(notification);
};

// Create a break completion notification
export const createBreakCompleteNotification = (): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'breakComplete',
    title: 'Hết giờ nghỉ',
    message: 'Thời gian nghỉ đã kết thúc. Sẵn sàng cho phiên tập trung tiếp theo?',
    priority: 'medium'
  };
  
  useNotificationStore.getState().addNotification(notification);
};

// Create an achievement notification
export const createAchievementNotification = (
  achievementTitle: string,
  achievementDescription: string
): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'achievement',
    title: `Thành tựu mới: ${achievementTitle}`,
    message: achievementDescription,
    priority: 'medium'
  };

  useNotificationStore.getState().addNotification(notification);
};

// Create an inactivity warning notification
export const createInactivityNotification = (
  inactiveMinutes: number
): void => {
  const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
    type: 'inactivityWarning',
    title: 'Cảnh báo không hoạt động',
    message: `Bạn đã không thực hiện phiên Pomodoro nào trong ${inactiveMinutes} phút. Hãy bắt đầu một phiên tập trung để duy trì năng suất!`,
    priority: 'medium',
    actionRequired: true
  };

  useNotificationStore.getState().addNotification(notification);
};