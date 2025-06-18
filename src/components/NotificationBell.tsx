import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineBell, AiOutlineClose, AiOutlineCheck, AiOutlineWarning, AiOutlineCalendar, AiOutlineClockCircle, AiOutlineSetting } from 'react-icons/ai';
import { FiAlertTriangle, FiClock, FiSettings } from 'react-icons/fi';
import { Task, Project, getDailyTasks } from '../services/api';
import NotificationSettings from './NotificationSettings';

interface Notification {
  id: string;
  type: 'overdue' | 'upcoming' | 'ot' | 'system' | 'achievement' | 'pomodoroComplete' | 'breakComplete' | 'taskDeadline' | 'projectDeadline' | 'workloadWarning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low' | 'critical';
  relatedId?: string;
  relatedType?: 'task' | 'project';
  actionRequired?: boolean;
}

interface NotificationBellProps {
  onTaskSelect?: (taskId: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onTaskSelect, onProjectSelect }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    }

    // Set up real-time notification listener
    const handleNewNotification = (event: any, notification: Notification) => {
      addNotification(notification);
    };

    window.ipc?.on('new-notification', handleNewNotification);

    // Set up notification click handler
    const handleNotificationClick = (event: any, notification: Notification) => {
      markAsRead(notification.id);
      
      if (notification.relatedId) {
        if (notification.relatedType === 'task' && onTaskSelect) {
          onTaskSelect(notification.relatedId);
        } else if (notification.relatedType === 'project' && onProjectSelect) {
          onProjectSelect(notification.relatedId);
        }
      }
      
      // Focus window
      // This is handled by the main process
    };

    window.ipc?.on('notification-clicked', handleNotificationClick);

    // Set up periodic check for new notifications
    const checkInterval = setInterval(() => {
      checkForNewNotifications();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Initial check
    checkForNewNotifications();

    return () => {
      window.ipc?.removeListener('new-notification', handleNewNotification);
      window.ipc?.removeListener('notification-clicked', handleNotificationClick);
      clearInterval(checkInterval);
    };
  }, [onTaskSelect, onProjectSelect]);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
    
    // Save notifications to localStorage
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for custom events from other components
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.notification) {
        addNotification(detail.notification);
      }
    };

    window.addEventListener('new-notification', handleNewNotification);
    return () => window.removeEventListener('new-notification', handleNewNotification);
  }, [notifications]);

  // Listen for check requests from main process
  useEffect(() => {
    const handleCheckOverdueTasks = () => {
      checkForOverdueTasks();
    };
    
    const handleCheckUpcomingDeadlines = () => {
      checkForUpcomingDeadlines();
    };
    
    const handleCheckProjectDeadlines = () => {
      checkForProjectDeadlines();
    };
    
    const handleCheckWorkloadWarnings = () => {
      checkForWorkloadWarnings();
    };
    
    window.ipc?.on('check-overdue-tasks', handleCheckOverdueTasks);
    window.ipc?.on('check-upcoming-deadlines', handleCheckUpcomingDeadlines);
    window.ipc?.on('check-project-deadlines', handleCheckProjectDeadlines);
    window.ipc?.on('check-workload-warnings', handleCheckWorkloadWarnings);
    
    return () => {
      window.ipc?.removeListener('check-overdue-tasks', handleCheckOverdueTasks);
      window.ipc?.removeListener('check-upcoming-deadlines', handleCheckUpcomingDeadlines);
      window.ipc?.removeListener('check-project-deadlines', handleCheckProjectDeadlines);
      window.ipc?.removeListener('check-workload-warnings', handleCheckWorkloadWarnings);
    };
  }, []);

  const checkForNewNotifications = async () => {
    try {
      // Get daily tasks to check for upcoming deadlines
      const dailyData = await getDailyTasks();
      
      // Check for tasks with deadlines today
      dailyData.tasksWithDeadline.forEach(task => {
        if (task.status !== 'done') {
          const notificationId = `task-deadline-${task._id}`;
          const existingNotification = notifications.find(n => n.id === notificationId);
          
          if (!existingNotification) {
            addNotification({
              id: notificationId,
              type: 'taskDeadline',
              title: 'Deadline hôm nay',
              message: `Task "${task.title}" đến hạn hôm nay`,
              timestamp: new Date(),
              read: false,
              priority: 'medium',
              relatedId: task._id,
              relatedType: 'task'
            });
          }
        }
      });
      
      // Check for overdue tasks
      const now = new Date();
      dailyData.tasksInProgress.forEach(task => {
        if (task.deadline && new Date(task.deadline) < now && task.status !== 'done') {
          const notificationId = `task-overdue-${task._id}`;
          const existingNotification = notifications.find(n => n.id === notificationId);
          
          if (!existingNotification) {
            const daysOverdue = Math.floor((now.getTime() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24));
            
            addNotification({
              id: notificationId,
              type: 'overdue',
              title: 'Task quá hạn',
              message: `Task "${task.title}" đã quá hạn ${daysOverdue} ngày`,
              timestamp: new Date(),
              read: false,
              priority: 'high',
              relatedId: task._id,
              relatedType: 'task',
              actionRequired: true
            });
          }
        }
      });
      
      // Check for projects with upcoming deadlines
      dailyData.projects.forEach(project => {
        const notificationId = `project-upcoming-${project._id}`;
        const existingNotification = notifications.find(n => n.id === notificationId);
        
        if (!existingNotification) {
          addNotification({
            id: notificationId,
            type: 'projectDeadline',
            title: 'Dự án sắp đến hạn',
            message: `Dự án "${project.name}" sắp đến hạn`,
            timestamp: new Date(),
            read: false,
            priority: 'medium',
            relatedId: project._id,
            relatedType: 'project'
          });
        }
      });
    } catch (error) {
      console.error('Failed to check for new notifications:', error);
    }
  };

  const checkForOverdueTasks = async () => {
    // This would be implemented to check for overdue tasks
    // Similar to the code in checkForNewNotifications
  };

  const checkForUpcomingDeadlines = async () => {
    // Check for upcoming deadlines
  };

  const checkForProjectDeadlines = async () => {
    // Check for project deadlines
  };

  const checkForWorkloadWarnings = async () => {
    // Check for workload warnings
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Check if notification with this ID already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        // Update existing notification
        return prev.map(n => n.id === notification.id ? { ...notification, timestamp: new Date() } : n);
      } else {
        // Add new notification
        return [notification, ...prev];
      }
    });

    // If it's a system notification and OS notifications are enabled, show it
    if (notification.type === 'system' || notification.priority === 'high' || notification.priority === 'critical') {
      // This is now handled by the main process
      window.ipc?.send('show-notification', notification);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Handle related item navigation
    if (notification.relatedId) {
      if (notification.relatedType === 'task' && onTaskSelect) {
        onTaskSelect(notification.relatedId);
      } else if (notification.relatedType === 'project' && onProjectSelect) {
        onProjectSelect(notification.relatedId);
      }
    }
    
    // Close dropdown
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'overdue':
        return <FiAlertTriangle className="text-red-500" />;
      case 'upcoming':
      case 'taskDeadline':
      case 'projectDeadline':
        return <AiOutlineCalendar className="text-blue-500" />;
      case 'ot':
      case 'workloadWarning':
        return <AiOutlineClockCircle className="text-orange-500" />;
      case 'achievement':
        return <AiOutlineTrophy className="text-purple-500" />;
      case 'pomodoroComplete':
      case 'breakComplete':
        return <AiOutlineCheck className="text-green-500" />;
      default:
        return <AiOutlineBell className="text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 relative"
      >
        <AiOutlineBell className="text-lg sm:text-xl text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Thông báo</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Cài đặt thông báo"
              >
                <FiSettings className="text-sm text-gray-500 dark:text-gray-400" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Đánh dấu đã đọc
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <AiOutlineBell className="text-4xl mx-auto mb-2 opacity-50" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <AiOutlineClose className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {notification.actionRequired && (
                          <span className="text-xs text-red-500 dark:text-red-400 font-medium">
                            Yêu cầu xác nhận
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showSettings && (
        <NotificationSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;