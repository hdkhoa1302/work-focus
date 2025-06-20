import React, { useState, useEffect } from 'react';
import { AiOutlineBulb, AiOutlineTrophy, AiOutlinePlus, AiOutlineFire, AiOutlineClose } from 'react-icons/ai';
import { FiTarget, FiTrendingUp, FiLoader } from 'react-icons/fi';
import useLanguage from '../hooks/useLanguage';
import DailyTaskList from './DailyTaskList';
import TaskDetailModal from './TaskDetailModal';
import useStores from '../hooks/useStores';
import MarkdownRenderer from './MarkdownRenderer';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { taskStore, sessionStore, analyticsStore, uiStore } = useStores();
  
  const [showFullFeedback, setShowFullFeedback] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  
  const { 
    fetchProactiveFeedback, 
    proactiveFeedback, 
    isLoadingFeedback, 
    showFeedback, 
    setShowFeedback 
  } = analyticsStore;
  
  const tasks = taskStore.tasks;
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.status === 'done').length,
    todayPomodoros: sessionStore.getTodaySessions().filter(s => s.type === 'focus').length,
    totalPomodoros: sessionStore.getFocusSessions().length,
    focusTime: sessionStore.getTotalFocusTime()
  };

  useEffect(() => {
    // Auto-fetch proactive feedback on initial load
    if (tasks.length > 0 || sessionStore.sessions.length > 0) {
      setTimeout(() => fetchProactiveFeedback(), 2000);
    }

    // Set up periodic proactive feedback (every 30 minutes)
    const feedbackInterval = setInterval(() => {
      if (tasks.length > 0 || sessionStore.sessions.length > 0) {
        fetchProactiveFeedback();
      }
    }, 30 * 60 * 1000);
    
    return () => clearInterval(feedbackInterval);
  }, [tasks.length, sessionStore.sessions.length, fetchProactiveFeedback]);

  const handleTaskSelect = (task: any) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleStartTask = (taskId: string) => {
    window.dispatchEvent(new CustomEvent('start-task', { 
      detail: { taskId } 
    }));
  };

  const handleTaskUpdate = (updatedTask: any) => {
    taskStore.updateTask(updatedTask._id, updatedTask);
    setSelectedTask(updatedTask);
  };

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
              <svg className="text-lg sm:text-2xl text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
              <svg className="text-lg sm:text-2xl text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Daily Tasks */}
        <div className="lg:col-span-2">
          <DailyTaskList 
            onTaskSelect={handleTaskSelect}
            onStartTask={handleStartTask}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">{t('dashboard.quickActions')}</h2>
          
          {/* AI Insights Card - Hiển thị compact khi có feedback */}
          {proactiveFeedback && showFeedback && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 min-w-0 flex-1">
                  <AiOutlineBulb className="text-lg mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm mb-1">💡 AI Insights</h4>
                    <div className="text-blue-100 text-xs leading-relaxed line-clamp-3">
                      <MarkdownRenderer content={proactiveFeedback.feedback.slice(0, 150) + (proactiveFeedback.feedback.length > 150 ? '...' : '')} />
                    </div>
                    <div className="mt-2 flex items-center space-x-3 text-xs text-blue-200">
                      <span>📊 {proactiveFeedback.stats.completionRate.toFixed(1)}%</span>
                      <span>🔥 {proactiveFeedback.stats.todayPomodoros}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex-shrink-0 ml-1"
                >
                  <AiOutlineClose className="text-sm" />
                </button>
              </div>
              {proactiveFeedback.feedback.length > 150 && (
                <button 
                  onClick={() => {
                    // Mở modal để xem full content
                    setShowFullFeedback(true);
                  }}
                  className="mt-2 text-xs text-blue-200 hover:text-white underline"
                >
                  Xem thêm...
                </button>
              )}
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            <button 
              onClick={() => window.dispatchEvent(new Event('create-task'))}
              className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <AiOutlinePlus className="text-lg sm:text-xl flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{t('dashboard.createNewTask')}</span>
            </button>
            
            <button 
              onClick={() => {
                const timerStore = useStores().timerStore;
                timerStore.startTimer();
              }}
              className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <AiOutlineFire className="text-lg sm:text-xl flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{t('dashboard.startFocusSession')}</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/reports'}
              className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <AiOutlineTrophy className="text-lg sm:text-xl flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{t('dashboard.viewReports')}</span>
            </button>

            {/* AI Insights Button */}
            <button 
              onClick={fetchProactiveFeedback}
              disabled={isLoadingFeedback}
              className="w-full flex items-center space-x-3 p-3 sm:p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoadingFeedback ? (
                <FiLoader className="text-lg sm:text-xl flex-shrink-0 animate-spin" />
              ) : (
                <AiOutlineBulb className="text-lg sm:text-xl flex-shrink-0" />
              )}
              <span className="font-medium text-sm sm:text-base">
                {isLoadingFeedback ? 'Đang phân tích...' : 'Get AI Insights'}
              </span>
            </button>
          </div>

          {/* Loading Feedback Indicator */}
          {isLoadingFeedback && (
            <div className="mt-4 p-3 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center space-x-2">
                <FiLoader className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-sm text-indigo-800 dark:text-indigo-300">💡 AI đang phân tích insights...</span>
              </div>
            </div>
          )}

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

          {/* AI Performance Insight - Small Summary */}
          {proactiveFeedback && !showFeedback && (
            <div className="mt-4 sm:mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <FiTrendingUp className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Performance Insight</span>
                <button
                  onClick={() => setShowFeedback(true)}
                  className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  Xem chi tiết
                </button>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Completion Rate: {proactiveFeedback.stats.completionRate.toFixed(1)}% | 
                Focus Time: {proactiveFeedback.stats.totalFocusTime}m
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={showTaskDetail}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onUpdate={handleTaskUpdate}
          onDelete={() => {
            taskStore.deleteTask(selectedTask._id);
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          onStart={() => handleStartTask(selectedTask._id)}
        />
      )}

      {/* Full Feedback Modal */}
      {showFullFeedback && proactiveFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">💡 AI Insights Chi Tiết</h2>
              <button
                onClick={() => setShowFullFeedback(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <AiOutlineClose className="text-xl text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-4 text-sm text-blue-800 dark:text-blue-300 mb-2">
                  <span>📊 Completion Rate: {proactiveFeedback.stats.completionRate.toFixed(1)}%</span>
                  <span>🔥 Today's Pomodoros: {proactiveFeedback.stats.todayPomodoros}</span>
                  <span>⏱️ Focus Time: {proactiveFeedback.stats.totalFocusTime}m</span>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                <MarkdownRenderer content={proactiveFeedback.feedback} />
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowFullFeedback(false)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;