import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineBell, AiOutlineClose, AiOutlineCheckCircle, AiOutlineWarning, AiOutlineCalendar, AiOutlineClockCircle, AiOutlineSetting, AiOutlineTrophy, AiOutlineEye, AiOutlineCheck, AiOutlinePause } from 'react-icons/ai';
import { FiSettings } from 'react-icons/fi';
import NotificationSettings from './NotificationSettings';
import useNotificationStore from '../stores/notificationStore';
import { Notification } from '../types/notification';

interface NotificationBellProps {
  onTaskSelect?: (taskId: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onTaskSelect, onProjectSelect }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.relatedId) {
      if (notification.relatedType === 'task' && onTaskSelect) {
        onTaskSelect(notification.relatedId);
      } else if (notification.relatedType === 'project' && onProjectSelect) {
        onProjectSelect(notification.relatedId);
      }
    }
    setIsDropdownOpen(false);
  };

  const handleActionClick = (e: React.MouseEvent, notification: Notification, action: string) => {
    e.stopPropagation();
    
    switch (action) {
      case 'view':
        if (notification.relatedId) {
          if (notification.relatedType === 'task' && onTaskSelect) {
            onTaskSelect(notification.relatedId);
          } else if (notification.relatedType === 'project' && onProjectSelect) {
            onProjectSelect(notification.relatedId);
          }
        }
        markAsRead(notification.id);
        setIsDropdownOpen(false);
        break;
      case 'complete':
        // TODO: Implement task completion logic
        markAsRead(notification.id);
        deleteNotification(notification.id);
        break;
      case 'snooze':
        // TODO: Implement snooze logic (re-add notification after delay)
        deleteNotification(notification.id);
        setTimeout(() => {
          // Re-add notification after 10 minutes
          useNotificationStore.getState().addNotification({
            type: notification.type,
            title: notification.title + ' (Snoozed)',
            message: notification.message,
            priority: notification.priority,
            relatedId: notification.relatedId,
            relatedType: notification.relatedType,
            actionRequired: notification.actionRequired,
          });
        }, 10 * 60 * 1000); // 10 minutes
        break;
      case 'dismiss':
        deleteNotification(notification.id);
        break;
    }
  };

  const getActionButtons = (notification: Notification) => {
    const baseClasses = "px-2 py-1 text-xs rounded-md font-medium transition-colors";
    
    switch (notification.type) {
      case 'overdue':
      case 'taskDeadline':
        return (
          <div className="flex gap-1 mt-2">
            {notification.relatedId && (
              <button
                onClick={(e) => handleActionClick(e, notification, 'view')}
                className={`${baseClasses} bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300`}
              >
                <AiOutlineEye className="inline w-3 h-3 mr-1" />
                Xem Task
              </button>
            )}
            <button
              onClick={(e) => handleActionClick(e, notification, 'complete')}
              className={`${baseClasses} bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300`}
            >
              <AiOutlineCheck className="inline w-3 h-3 mr-1" />
              Hoàn thành
            </button>
            <button
              onClick={(e) => handleActionClick(e, notification, 'snooze')}
              className={`${baseClasses} bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300`}
            >
              <AiOutlinePause className="inline w-3 h-3 mr-1" />
              Snooze 10p
            </button>
          </div>
        );
      case 'projectDeadline':
        return (
          <div className="flex gap-1 mt-2">
            {notification.relatedId && (
              <button
                onClick={(e) => handleActionClick(e, notification, 'view')}
                className={`${baseClasses} bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300`}
              >
                <AiOutlineEye className="inline w-3 h-3 mr-1" />
                Xem Dự án
              </button>
            )}
            <button
              onClick={(e) => handleActionClick(e, notification, 'dismiss')}
              className={`${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300`}
            >
              Đã biết
            </button>
          </div>
        );
      case 'workloadWarning':
        return (
          <div className="flex gap-1 mt-2">
            <button
              onClick={(e) => handleActionClick(e, notification, 'view')}
              className={`${baseClasses} bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300`}
            >
              Xem lịch
            </button>
            <button
              onClick={(e) => handleActionClick(e, notification, 'dismiss')}
              className={`${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300`}
            >
              Bỏ qua
            </button>
          </div>
        );
      case 'pomodoroComplete':
      case 'breakComplete':
        return (
          <div className="flex gap-1 mt-2">
            <button
              onClick={(e) => handleActionClick(e, notification, 'dismiss')}
              className={`${baseClasses} bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300`}
            >
              <AiOutlineCheck className="inline w-3 h-3 mr-1" />
              OK
            </button>
          </div>
        );
      case 'achievement':
        return (
          <div className="flex gap-1 mt-2">
            <button
              onClick={(e) => handleActionClick(e, notification, 'dismiss')}
              className={`${baseClasses} bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300`}
            >
              <AiOutlineTrophy className="inline w-3 h-3 mr-1" />
              Tuyệt vời!
            </button>
          </div>
        );
      default:
        return (
          <div className="flex gap-1 mt-2">
            <button
              onClick={(e) => handleActionClick(e, notification, 'dismiss')}
              className={`${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300`}
            >
              Đóng
            </button>
          </div>
        );
    }
  };

  const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'overdue': return <AiOutlineWarning className={`${iconClass} text-red-500`} />;
      case 'taskDeadline': return <AiOutlineCalendar className={`${iconClass} text-yellow-500`} />;
      case 'projectDeadline': return <AiOutlineCalendar className={`${iconClass} text-blue-500`} />;
      case 'workloadWarning': return <AiOutlineWarning className={`${iconClass} text-orange-500`} />;
      case 'pomodoroComplete': return <AiOutlineCheckCircle className={`${iconClass} text-green-500`} />;
      case 'breakComplete': return <AiOutlineClockCircle className={`${iconClass} text-green-500`} />;
      case 'achievement': return <AiOutlineTrophy className={`${iconClass} text-purple-500`} />;
      case 'system': return <AiOutlineBell className={`${iconClass} text-gray-500`} />;
      default: return <AiOutlineBell className={`${iconClass} text-gray-500`} />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return "vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return `hôm qua`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Group notifications by type and priority
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const key = `${notification.type}-${notification.priority}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const renderGroupedNotifications = () => {
    return Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => {
      const [type, priority] = groupKey.split('-');
      const isMultiple = groupNotifications.length > 1;
      
      if (isMultiple && ['overdue', 'taskDeadline', 'projectDeadline'].includes(type)) {
        // Group similar notifications
        const firstNotification = groupNotifications[0];
        return (
          <div
            key={groupKey}
            className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
              groupNotifications.some(n => !n.read) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="mt-1 flex-shrink-0">
                {getNotificationIcon(firstNotification.type, firstNotification.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {firstNotification.title} ({groupNotifications.length})
                  </h4>
                  <div className="flex items-center space-x-2">
                    {groupNotifications.some(n => !n.read) && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        groupNotifications.forEach(n => deleteNotification(n.id));
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <AiOutlineClose className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bạn có {groupNotifications.length} {type === 'overdue' ? 'task quá hạn' : type === 'taskDeadline' ? 'task sắp đến hạn' : 'dự án sắp đến hạn'}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {formatTimestamp(new Date(groupNotifications[0].timestamp))}
                  </span>
                </div>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Navigate to tasks/projects page with filter
                      groupNotifications.forEach(n => markAsRead(n.id));
                      setIsDropdownOpen(false);
                    }}
                    className="px-2 py-1 text-xs rounded-md font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
                  >
                    <AiOutlineEye className="inline w-3 h-3 mr-1" />
                    Xem tất cả
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      groupNotifications.forEach(n => markAsRead(n.id));
                    }}
                    className="px-2 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Đánh dấu đã đọc
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // Render individual notifications
        return groupNotifications.map(notification => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
              !notification.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
            }`}
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
                    {formatTimestamp(new Date(notification.timestamp))}
                  </span>
                </div>
                {getActionButtons(notification)}
              </div>
            </div>
          </div>
        ));
      }
    });
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-600 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <AiOutlineBell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 block h-2.5 w-2.5 transform bg-red-500 rounded-full"></span>
          )}
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
            <>
              <div className="p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Thông báo</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { setIsSettingsOpen(true); setIsDropdownOpen(false); }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Cài đặt"
                  >
                    <FiSettings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
                    disabled={unreadCount === 0}
                  >
                    Đánh dấu đã đọc
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  renderGroupedNotifications()
                ) : (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    <AiOutlineBell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                    <h4 className="font-semibold">Không có thông báo mới</h4>
                    <p className="text-sm">Bạn đã xem hết tất cả!</p>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-center">
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 font-medium"
                  >
                    Xóa tất cả thông báo
                  </button>
                </div>
              )}
            </>
          </div>
        )}
      </div>
      
      <NotificationSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

export default NotificationBell;