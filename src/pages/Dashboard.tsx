import React, { useEffect, useState } from 'react';
import { getTasks, getSessions, Task, Session } from '../services/api';
import { 
  AiOutlineCheckCircle, 
  AiOutlineClockCircle, 
  AiOutlineFire, 
  AiOutlineCalendar,
  AiOutlineTrophy,
  AiOutlinePlus
} from 'react-icons/ai';
import { FiTarget } from 'react-icons/fi';
import useLanguage from '../hooks/useLanguage';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    todayPomodoros: 0,
    totalPomodoros: 0,
    focusTime: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksData, sessionsData] = await Promise.all([getTasks(), getSessions()]);
        setTasks(tasksData);
        setSessions(sessionsData);

        // Calculate stats
        const completedTasks = tasksData.filter(task => task.status === 'done').length;
        const totalPomodoros = sessionsData.filter(s => s.type === 'focus').length;
        
        // Today's pomodoros
        const today = new Date().toDateString();
        const todayPomodoros = sessionsData.filter(s => 
          s.type === 'focus' && new Date(s.startTime).toDateString() === today
        ).length;

        // Total focus time in minutes
        const focusTime = sessionsData
          .filter(s => s.type === 'focus')
          .reduce((total, s) => total + (s.duration || 0), 0);

        setStats({
          totalTasks: tasksData.length,
          completedTasks,
          todayPomodoros,
          totalPomodoros,
          focusTime: Math.round(focusTime / 60) // Convert to minutes
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    }
    fetchData();
  }, []);

  const recentTasks = tasks
    .filter(task => task.status !== 'done')
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 5);

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('dashboard.welcome')}</h1>
            <p className="text-blue-100 text-base sm:text-lg">{t('dashboard.welcomeMessage')}</p>
          </div>
          <div className="hidden sm:block flex-shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <AiOutlineFire className="text-3xl sm:text-4xl text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{t('dashboard.totalTasks')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTasks}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiTarget className="text-lg sm:text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{t('dashboard.completed')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.completedTasks}</p>
              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 truncate">{t('dashboard.completionRate', { rate: completionRate.toFixed(1) })}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <AiOutlineCheckCircle className="text-lg sm:text-2xl text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{t('dashboard.todaysPomodoros')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.todayPomodoros}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <AiOutlineFire className="text-lg sm:text-2xl text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{t('dashboard.focusTime')}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.focusTime}m</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <AiOutlineClockCircle className="text-lg sm:text-2xl text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.recentTasks')}</h2>
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm sm:text-base">
              {t('dashboard.viewAll')}
            </button>
          </div>
          
          {recentTasks.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {recentTasks.map(task => (
                <div key={task._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      task.status === 'done' ? 'bg-green-500' :
                      task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">{task.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{task.description?.replace(/<[^>]*>/g, '') || t('dashboard.noDescription')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('start-task', { detail: { taskId: task._id, projectId: task.projectId } }))}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                  >
                    {t('dashboard.start')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <FiTarget className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">{t('dashboard.noTasksYet')}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">{t('dashboard.quickActions')}</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <button 
              onClick={() => window.dispatchEvent(new Event('create-task'))}
              className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <AiOutlinePlus className="text-lg sm:text-xl flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{t('dashboard.createNewTask')}</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
              <AiOutlineFire className="text-lg sm:text-xl flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{t('dashboard.startFocusSession')}</span>
            </button>
            
            <button className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
              <AiOutlineTrophy className="text-lg sm:text-xl flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{t('dashboard.viewReports')}</span>
            </button>
          </div>

          {/* Achievement Badge */}
          {stats.todayPomodoros >= 4 && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-white">
              <div className="flex items-center space-x-3">
                <AiOutlineTrophy className="text-xl sm:text-2xl flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base">{t('dashboard.achievementUnlocked')}</p>
                  <p className="text-xs sm:text-sm opacity-90">{t('dashboard.productiveDay')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;