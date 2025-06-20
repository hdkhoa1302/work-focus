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
import useNotificationStore from '../stores/notificationStore';
import { NotificationConfig } from '../types/notification';
import { useLanguage } from '../hooks/useLanguage';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig } = useNotificationStore();
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleUpdateConfig = async (updates: Partial<NotificationConfig>) => {
    setIsSaving(true);
    try {
      await updateConfig(updates);
      setSaveMessage(t('notifications.settings.settingsUpdated'));
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Failed to save notification config:', error);
      setSaveMessage(t('notifications.settings.settingsError'));
      setTimeout(() => setSaveMessage(''), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTypeConfig = (type: keyof NotificationConfig['types'], enabled: boolean) => {
    handleUpdateConfig({
      types: {
        ...config.types,
        [type]: enabled
      }
    });
  };

  const testNotification = () => {
    // Use the store to add notification - this ensures both in-app and OS notifications
    useNotificationStore.getState().addNotification({
      type: 'system',
      title: t('notifications.messages.testNotification.title'),
      message: t('notifications.messages.testNotification.message'),
      priority: 'high', // Changed to 'high' to ensure OS notification is shown
      actionRequired: false
    });
  };

  const notificationTypes = [
    {
      key: 'taskOverdue' as const,
      title: t('notifications.types.taskOverdue.title'),
      description: t('notifications.types.taskOverdue.description'),
      icon: <AiOutlineWarning className="text-red-500" />,
      color: 'red'
    },
    {
      key: 'taskDeadline' as const,
      title: t('notifications.types.taskDeadline.title'),
      description: t('notifications.types.taskDeadline.description'),
      icon: <AiOutlineClockCircle className="text-yellow-500" />,
      color: 'yellow'
    },
    {
      key: 'projectDeadline' as const,
      title: t('notifications.types.projectDeadline.title'),
      description: t('notifications.types.projectDeadline.description'),
      icon: <AiOutlineClockCircle className="text-blue-500" />,
      color: 'blue'
    },
    {
      key: 'workloadWarning' as const,
      title: t('notifications.types.workloadWarning.title'),
      description: t('notifications.types.workloadWarning.description'),
      icon: <AiOutlineWarning className="text-orange-500" />,
      color: 'orange'
    },
    {
      key: 'pomodoroComplete' as const,
      title: t('notifications.types.pomodoroComplete.title'),
      description: t('notifications.types.pomodoroComplete.description'),
      icon: <AiOutlineCheckCircle className="text-green-500" />,
      color: 'green'
    },
    {
      key: 'breakComplete' as const,
      title: t('notifications.types.breakComplete.title'),
      description: t('notifications.types.breakComplete.description'),
      icon: <AiOutlineCheckCircle className="text-blue-500" />,
      color: 'blue'
    },
    {
      key: 'achievement' as const,
      title: t('notifications.types.achievement.title'),
      description: t('notifications.types.achievement.description'),
      icon: <AiOutlineTrophy className="text-purple-500" />,
      color: 'purple'
    },
    {
      key: 'system' as const,
      title: t('notifications.types.system.title'),
      description: t('notifications.types.system.description'),
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('notifications.settings.title')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.subtitle')}</p>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('notifications.settings.generalSettings')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AiOutlineBell className="text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t('notifications.settings.enable')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.enableDescription')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => handleUpdateConfig({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {config.sound ? <FiVolume2 className="text-green-500" /> : <FiVolumeX className="text-gray-500" />}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t('notifications.settings.sound')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.soundDescription')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sound}
                    onChange={(e) => handleUpdateConfig({ sound: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AiOutlineDesktop className="text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t('notifications.settings.osNotifications')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.osNotificationsDescription')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.osNotifications}
                    onChange={(e) => handleUpdateConfig({ osNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AiOutlineClockCircle className="text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t('notifications.settings.checkInterval')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.checkIntervalDescription')}</p>
                  </div>
                </div>
                <select
                  value={config.checkInterval}
                  onChange={(e) => handleUpdateConfig({ checkInterval: Number(e.target.value) })}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>{t('notifications.intervals.1min')}</option>
                  <option value={5}>{t('notifications.intervals.5min')}</option>
                  <option value={10}>{t('notifications.intervals.10min')}</option>
                  <option value={15}>{t('notifications.intervals.15min')}</option>
                  <option value={30}>{t('notifications.intervals.30min')}</option>
                  <option value={60}>{t('notifications.intervals.1hour')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('notifications.settings.quietHours')}</h3>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <AiOutlineMoon className="text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t('notifications.settings.quietHoursEnable')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.quietHoursDescription')}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.quietHours.enabled}
                    onChange={(e) => handleUpdateConfig({ 
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
                    {t('notifications.settings.quietHoursStart')}
                  </label>
                  <input
                    type="time"
                    value={config.quietHours.start}
                    onChange={(e) => handleUpdateConfig({ 
                      quietHours: { ...config.quietHours, start: e.target.value } 
                    })}
                    disabled={!config.quietHours.enabled}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('notifications.settings.quietHoursEnd')}
                  </label>
                  <input
                    type="time"
                    value={config.quietHours.end}
                    onChange={(e) => handleUpdateConfig({ 
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('notifications.settings.notificationTypes')}</h3>
            
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
                      onChange={(e) => handleUpdateTypeConfig(type.key, e.target.checked)}
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
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t('notifications.settings.test')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('notifications.settings.testDescription')}</p>
                </div>
              </div>
              <button
                onClick={testNotification}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('notifications.settings.testButton')}
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
              {t('notifications.settings.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;