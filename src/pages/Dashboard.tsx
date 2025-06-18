import React, { useEffect, useState } from 'react';
import { getTasks, getSessions, Task, Session, getProactiveFeedback, ProactiveFeedbackResponse, getDailyTasks, DailyTasksResponse } from '../services/api';
import { 
  AiOutlineCheckCircle, 
  AiOutlineClockCircle, 
  AiOutlineFire, 
  AiOutlineCalendar,
  AiOutlineTrophy,
  AiOutlinePlus,
  AiOutlineBulb,
  AiOutlineClose
} from 'react-icons/ai';
import { FiTarget, FiTrendingUp, FiLoader } from 'react-icons/fi';
import useLanguage from '../hooks/useLanguage';
import DailyTaskList from '../components/DailyTaskList';
import TaskDetailModal from '../components/TaskDetailModal';

// Simple markdown renderer component
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    return text
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Lists
      .replace(/^• (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div 
      className="whitespace-pre-wrap leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
};

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dailyData, setDailyData] = useState<DailyTasksResponse | null>(null);
  const [proactiveFeedback, setProactiveFeedback] = useState<ProactiveFeedbackResponse | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [isLoadingDailyTasks, setIsLoadingDailyTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
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

        // Auto-fetch proactive feedback on initial load
        if (tasksData.length > 0 || sessionsData.length > 0) {
          setTimeout(() => fetchProactiveFeedback(), 2000);
        }
        
        // Fetch daily tasks
        fetchDailyTasks();
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    }
    fetchData();

    // Set up periodic proactive feedback (every 30 minutes)
    const feedbackInterval = setInterval(() => {
      if (tasks.length > 0 || sessions.length > 0) {
        fetchProactiveFeedback();
      }
    }, 30 * 60 * 1000);
    
    return () => clearInterval(feedbackInterval);
  }, []);

  const fetchProactiveFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const feedback = await getProactiveFeedback();
      setProactiveFeedback(feedback);
      
      // Show feedback notification if it's meaningful
      if (feedback.feedback && feedback.feedback.length > 50) {
        setShowFeedback(true);
      }
    } catch (error) {
      console.error('Failed to fetch proactive feedback:', error);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const fetchDailyTasks = async () => {
    setIsLoadingDailyTasks(true);
    try {
      const data = await getDailyTasks();
      setDailyData(data);
    } catch (error) {
      console.error('Failed to fetch daily tasks:', error);
    } finally {
      setIsLoadingDailyTasks(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleStartTask = (taskId: string) => {
    window.dispatchEvent(new CustomEvent('start-task', { 
      detail: { taskId } 
    }));
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
    setSelectedTask(updatedTask);
    fetchDailyTasks(); // Refresh daily tasks
  };

  const recentTasks = tasks
    .filter(task => task.status !== 'done')
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 5);

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Proactive Feedback Notification */}
      {showFeedback && proactiveFeedback && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white shadow-lg animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AiOutlineBulb className="text-2xl mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold mb-2">💡 AI Insights for You</h3>
                <div className="text-blue-100 text-sm leading-relaxed">
                  <MarkdownRenderer content={proactiveFeedback.feedback} />
                </div>
                <div className="mt-3 flex items-center space-x-4 text-xs text-blue-200">
                  <span>📊 Completion: {proactiveFeedback.stats.completionRate.toFixed(1)}%</span>
                  <span>🔥 Today: {proactiveFeedback.stats.todayPomodoros} Pomodoros</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowFeedback(false)}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex-shrink-0"
            >
              <AiOutlineClose className="text-lg" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Feedback Notification */}
      {isLoadingFeedback && !showFeedback && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 text-white shadow-lg animate-pulse">
          <div className="flex items-center space-x-3">
            <FiLoader className="text-2xl animate-spin flex-shrink-0" />
            <div>
              <h3 className="font-semibold">💡 AI đang phân tích...</h3>
              <p className="text-indigo-100 text-sm">Đang tạo insights cá nhân hóa cho bạn</p>
            </div>
          </div>
        </div>
      )}

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

          {/* AI Performance Insight */}
          {proactiveFeedback && (
            <div className="mt-4 sm:mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-2">
                <FiTrendingUp className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Performance Insight</span>
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
            setTasks(prev => prev.filter(t => t._id !== selectedTask._id));
            setShowTaskDetail(false);
            setSelectedTask(null);
            fetchDailyTasks(); // Refresh daily tasks
          }}
          onStart={() => handleStartTask(selectedTask._id)}
        />
      )}
    </div>
  );
};

export default Dashboard;