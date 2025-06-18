import React, { useState, useEffect } from 'react';
import { 
  AiOutlineBell, 
  AiOutlineClockCircle, 
  AiOutlineWarning,
  AiOutlineCheckCircle,
  AiOutlineTrophy,
  AiOutlineDesktop,
  AiOutlineSound,
  AiOutlineMoon
} from 'react-icons/ai';
import { FiSettings, FiVolume2, FiVolumeX } from 'react-icons/fi';

interface NotificationConfig {
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
  checkInterval: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<NotificationConfig>({
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
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = () => {
    // Request config from main process
    window.ipc?.send('get-notification-config');
    
    const handleConfig = (event: any, receivedConfig: NotificationConfig) => {
      setConfig(receivedConfig);
    };
    
    window.ipc?.on('notification-config', handleConfig);
    
    return () => {
      window.ipc?.removeListener('notification-config', handleConfig);
    };
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // Send config to main process
      window.ipc?.send('update-notification-config', config);
      
      // Also save to localStorage for renderer process
      localStorage.setItem('notificationConfig', JSON.stringify(config));
      
      setSaveMessage('Cài đặt đã được lưu thành công!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save notification config:', error);
      setSaveMessage('Lỗi khi lưu cài đặt. Vui lòng thử lại.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (updates: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateTypeConfig = (type: keyof NotificationConfig['types'], enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: enabled
      }
    }));
  };

  const testNotification = () => {
    const testNotificationData = {
      id: `test-${Date.now()}`,
      type: 'system' as const,
      title: 'Thông báo thử nghiệm',
      body: 'Đây là thông báo thử nghiệm để kiểm tra cài đặt của bạn.',
      priority: 'medium' as const,
      timestamp: new Date(),
      requiresConfirmation: false
    };

    window.ipc?.send('show-notification', testNotificationData);
  };

  const notificationTypes = [
    {
      key: 'taskOverdue' as const,
      title: 'Task quá hạn',
      description: 'Thông báo khi task đã quá deadline',
      icon: <AiOutlineWarning className="text-red-500" />,
      color: 'red'
    },
    {
      key: 'taskDeadline' as const,
      title: 'Deadline sắp đến',
      description: 'Thông báo khi task sắp đến deadline',
      icon: <AiOutlineClockCircle className="text-yellow-500" />,
      color: 'yellow'
    },
    {
      key: 'projectDeadline' as const,
      title: 'Deadline dự án',
      description: 'Thông báo về deadline của dự án',
      icon: <AiOutlineClockCircle className="text-blue-500" />,
      color: 'blue'
    },
    {
      key: 'workloadWarning' as const,
      title: 'Cảnh báo quá tải',
      description: 'Thông báo khi khối lượng công việc quá nhiều',
      icon: <AiOutlineWarning className="text-orange-500" />,
      color: 'orange'
    },
    {
      key: 'pomodoroComplete' as const,
      title: 'Hoàn thành Pomodoro',
      description: 'Thông báo khi phiên tập trung kết thúc',
      icon: <AiOutlineCheckCircle className="text-green-500" />,
      color: 'green'
    },
    {
      key: 'breakComplete' as const,
      title: 'Hết giờ nghỉ',
      description: 'Thông báo khi phiên nghỉ kết thúc',
      icon: <AiOutlineCheckCircle className="text-blue-500" />,
      color: 'blue'
    },
    {
      key: 'achievement' as const,
      title: 'Thành tích',
      description: 'Thông báo khi đạt được thành tích mới',
      icon: <AiOutlineTrophy className="text-purple-500" />,
      color: 'purple'
    },
    {
      key: 'system' as const,
      title: 'Hệ thống',
      description: 'Thông báo hệ thống và cập nhật',
      icon: <AiOutlineBell className="text-gray-500" />,
      color: 'gray'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <AiOutlineBell className="text-xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cài đặt thông báo</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quản lý thông báo và cảnh báo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <AiOutlineWarning className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Master Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cài đặt chung</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AiOutlineBell className="text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Bật thông báo</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hiển thị tất cả thông báo</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => updateConfig({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {config.sound ? <FiVolume2 className="text-green-500" /> : <FiVolumeX className="text-gray-500" />}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Âm thanh</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phát âm thanh khi có thông báo</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sound}
                    onChange={(e) => updateConfig({ sound: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AiOutlineDesktop className="text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Thông báo hệ thống</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hiển thị thông báo trên OS</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.osNotifications}
                    onChange={(e) => updateConfig({ osNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AiOutlineClockCircle className="text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Kiểm tra mỗi</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tần suất kiểm tra thông báo</p>
                  </div>
                </div>
                <select
                  value={config.checkInterval}
                  onChange={(e) => updateConfig({ checkInterval: Number(e.target.value) })}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 phút</option>
                  <option value={5}>5 phút</option>
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút</option>
                  <option value={30}>30 phút</option>
                  <option value={60}>1 giờ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Giờ yên tĩnh</h3>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <AiOutlineMoon className="text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Bật giờ yên tĩnh</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tắt thông báo trong khoảng thời gian cụ thể</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.quietHours.enabled}
                    onChange={(e) => updateConfig({ 
                      quietHours: { ...config.quietHours, enabled: e.target.checked } 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bắt đầu
                  </label>
                  <input
                    type="time"
                    value={config.quietHours.start}
                    onChange={(e) => updateConfig({ 
                      quietHours: { ...config.quietHours, start: e.target.value } 
                    })}
                    disabled={!config.quietHours.enabled}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kết thúc
                  </label>
                  <input
                    type="time"
                    value={config.quietHours.end}
                    onChange={(e) => updateConfig({ 
                      quietHours: { ...config.quietHours, end: e.target.value } 
                    })}
                    disabled={!config.quietHours.enabled}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Loại thông báo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className={`flex items-center justify-between p-4 bg-${type.color}-50 dark:bg-${type.color}-900/20 rounded-lg border border-${type.color}-200 dark:border-${type.color}-800/30`}>
                  <div className="flex items-center space-x-3">
                    {type.icon}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{type.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.types[type.key]}
                      onChange={(e) => updateTypeConfig(type.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Test Notification */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiSettings className="text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Kiểm tra thông báo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gửi thông báo thử nghiệm để kiểm tra cài đặt</p>
                </div>
              </div>
              <button
                onClick={testNotification}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Thử nghiệm
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {saveMessage && (
              <span className={`text-sm font-medium ${
                saveMessage.includes('thành công') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {saveMessage}
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;