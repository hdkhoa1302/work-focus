import React, { useState, useEffect } from 'react';
import { AiOutlineBell, AiOutlineClose, AiOutlineCheck, AiOutlineWarning, AiOutlineCalendar } from 'react-icons/ai';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';

interface Notification {
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

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSelect?: (taskId: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  isOpen, 
  onClose,
  onTaskSelect,
  onProjectSelect
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'medium' | 'low'>('all');

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
  }, [isOpen]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

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
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'high':
        return notifications.filter(n => n.priority === 'high');
      case 'medium':
        return notifications.filter(n => n.priority === 'medium');
      case 'low':
        return notifications.filter(n => n.priority === 'low');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'overdue':
        return <FiAlertTriangle className="text-red-500" />;
      case 'upcoming':
        return <AiOutlineCalendar className="text-blue-500" />;
      case 'ot':
        return <FiClock className="text-orange-500" />;
      default:
        return <AiOutlineBell className="text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
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

  if (!isOpen) return null;

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <AiOutlineBell className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trung tâm thông báo</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {unreadCount} thông báo chưa đọc
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineClose className="text-gray-500" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 p-2 bg-gray-100 dark:bg-gray-700">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'unread', label: 'Chưa đọc' },
            { key: 'high', label: 'Quan trọng' },
            { key: 'medium', label: 'Thông thường' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filter === key
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="max-h-[50vh] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <AiOutlineBell className="text-4xl mx-auto mb-2 opacity-50" />
              <p>Không có thông báo nào</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
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
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
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
                          <AiOutlineClose className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
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

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <AiOutlineCheck className="inline mr-1" />
                Đánh dấu đã đọc tất cả
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                <AiOutlineClose className="inline mr-1" />
                Xóa tất cả
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;