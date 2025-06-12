import React, { useState, useEffect } from 'react';
import { 
  AiOutlineClockCircle, 
  AiOutlineShield, 
  AiOutlineBell, 
  AiOutlineDatabase,
  AiOutlineSave,
  AiOutlineReload
} from 'react-icons/ai';

interface Config {
  pomodoro: {
    focus: number;
    break: number;
  };
  blockList: {
    hosts: string[];
    apps: string[];
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
  };
}

const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<Config>({
    pomodoro: { focus: 25, break: 5 },
    blockList: { hosts: [], apps: [] },
    notifications: { enabled: true, sound: true }
  });
  const [newHost, setNewHost] = useState('');
  const [newApp, setNewApp] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/config');
      const data = await response.json();
      setConfig({
        pomodoro: data.pomodoro || { focus: 25, break: 5 },
        blockList: data.blockList || { hosts: [], apps: [] },
        notifications: data.notifications || { enabled: true, sound: true }
      });
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:3000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMessage('Failed to save settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const addHost = () => {
    if (newHost.trim() && !config.blockList.hosts.includes(newHost.trim())) {
      setConfig(prev => ({
        ...prev,
        blockList: {
          ...prev.blockList,
          hosts: [...prev.blockList.hosts, newHost.trim()]
        }
      }));
      setNewHost('');
    }
  };

  const removeHost = (host: string) => {
    setConfig(prev => ({
      ...prev,
      blockList: {
        ...prev.blockList,
        hosts: prev.blockList.hosts.filter(h => h !== host)
      }
    }));
  };

  const addApp = () => {
    if (newApp.trim() && !config.blockList.apps.includes(newApp.trim())) {
      setConfig(prev => ({
        ...prev,
        blockList: {
          ...prev.blockList,
          apps: [...prev.blockList.apps, newApp.trim()]
        }
      }));
      setNewApp('');
    }
  };

  const removeApp = (app: string) => {
    setConfig(prev => ({
      ...prev,
      blockList: {
        ...prev.blockList,
        apps: prev.blockList.apps.filter(a => a !== app)
      }
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Customize your FocusTrack experience</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {saveMessage && (
            <span className={`text-sm font-medium ${
              saveMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'
            }`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={fetchConfig}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            <AiOutlineReload className="text-lg" />
            <span>Reset</span>
          </button>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <AiOutlineSave className="text-lg" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pomodoro Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AiOutlineClockCircle className="text-xl text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pomodoro Timer</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configure your focus and break durations</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Focus Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.pomodoro.focus}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  pomodoro: { ...prev.pomodoro, focus: Number(e.target.value) }
                }))}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.pomodoro.break}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  pomodoro: { ...prev.pomodoro, break: Number(e.target.value) }
                }))}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <AiOutlineBell className="text-xl text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage notification preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Desktop Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Show notifications when sessions end</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notifications.enabled}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, enabled: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Sound Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Play sound when sessions end</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notifications.sound}
                  onChange={e => setConfig(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, sound: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Website Blocker */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <AiOutlineShield className="text-xl text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Website Blocker</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Block distracting websites during focus sessions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter website (e.g., facebook.com)"
              value={newHost}
              onChange={e => setNewHost(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addHost()}
              className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addHost}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {config.blockList.hosts.map((host, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100">{host}</span>
                <button
                  onClick={() => removeHost(host)}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
            {config.blockList.hosts.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No blocked websites. Add some to improve your focus!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* App Blocker */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <AiOutlineDatabase className="text-xl text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Application Blocker</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Block distracting applications during focus sessions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter app name (e.g., Discord, Slack)"
              value={newApp}
              onChange={e => setNewApp(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addApp()}
              className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addApp}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {config.blockList.apps.map((app, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-gray-100">{app}</span>
                <button
                  onClick={() => removeApp(app)}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
            {config.blockList.apps.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No blocked applications. Add some to stay focused!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;