import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import AuthScreen from './components/auth/AuthScreen';
import Sidebar from './components/Sidebar';
import { Dashboard, ProjectsPage, ReportsPage, SettingsPage, SchedulePage } from './pages';
import ChatPage from './pages/ChatPage';
import TaskFormModal from './components/TaskFormModal';
import CompactTimerCard from './components/timer/CompactTimerCard';
import FloatingTimer from './components/timer/FloatingTimer';
import ChatWidget from './components/ChatWidget';
import EncouragementModal from './components/EncouragementModal';
import OvertimeNotificationManager from './components/OvertimeNotificationManager';
import InactivityManager from './components/InactivityManager';
import { AiOutlineMoon, AiOutlineSun, AiOutlineUser, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';
import { FiLogOut } from 'react-icons/fi';
import { getTasks, Task, getEncouragement } from './services/api';
import useTimerStore from './stores/timerStore';
import NotificationBell from './components/NotificationBell';
import useLanguage from '../hooks/useLanguage';
import useNotificationStore from '../stores/notificationStore';
import ActivityTracker from './components/ActivityTracker';

function AppContent() {
  const { t } = useLanguage();
  const { user, logout, isLoading } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Encouragement modal state
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [completedTask, setCompletedTask] = useState<{ id: string; title: string } | null>(null);
  
  // Use timer store
  const { 
    selectedTaskId,
    setSelectedTask
  } = useTimerStore();
  
  // Use notification store for activity tracking
  const updateActivityTime = useNotificationStore(state => state.updateActivityTime);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      
      // Update activity time when user logs in
      updateActivityTime();
    }
  }, [user, updateActivityTime]);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('mobile-sidebar');
      const menuButton = document.getElementById('mobile-menu-button');
      if (showMobileSidebar && sidebar && !sidebar.contains(event.target as Node) && !menuButton?.contains(event.target as Node)) {
        setShowMobileSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileSidebar]);

  const fetchTasks = async () => {
    try {
      const tasksData = await getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handleStartTask = (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      setSelectedTask(taskId, task.projectId, task.title);
      useTimerStore.getState().startTimer({
        taskId,
        projectId: task.projectId,
        taskTitle: task.title
      });
    }
  };

  // Thêm listener cho sự kiện start-task từ Dashboard/TasksPage
  useEffect(() => {
    const onStartTaskEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      handleStartTask(detail.taskId);
    };
    window.addEventListener('start-task', onStartTaskEvent);
    return () => {
      window.removeEventListener('start-task', onStartTaskEvent);
    };
  }, []);

  // Thêm listener cho sự kiện create-task để mở modal tạo công việc
  useEffect(() => {
    const onCreateTaskEvent = () => {
      setShowTaskModal(true);
    };
    window.addEventListener('create-task', onCreateTaskEvent);
    return () => {
      window.removeEventListener('create-task', onCreateTaskEvent);
    };
  }, []);

  // Thêm listener cho sự kiện task-completed để hiển thị encouragement
  useEffect(() => {
    const onTaskCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setCompletedTask({ id: detail.taskId, title: detail.taskTitle });
      setShowEncouragement(true);
      
      // Update activity time when completing a task
      updateActivityTime();
    };
    window.addEventListener('task-completed', onTaskCompleted);
    return () => {
      window.removeEventListener('task-completed', onTaskCompleted);
    };
  }, [updateActivityTime]);

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      // Dispatch event to open task detail
      window.dispatchEvent(new CustomEvent('view-task-detail', { 
        detail: { taskId }
      }));
      
      // Update activity time when selecting a task
      updateActivityTime();
    }
  };

  const handleProjectSelect = (projectId: string) => {
    // Navigate to project page and select the project
    window.location.href = `/projects?id=${projectId}`;
    
    // Update activity time when selecting a project
    updateActivityTime();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/*" element={
            <>
              {/* Mobile Sidebar Overlay */}
              {showMobileSidebar && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" />
              )}

              {/* Sidebar */}
              <div className={`${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:transition-none`}>
                <Sidebar onClose={() => setShowMobileSidebar(false)} />
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between transition-colors duration-200">
                  <div className="flex items-center space-x-4 min-w-0">
                    {/* Mobile Menu Button */}
                    <button
                      id="mobile-menu-button"
                      onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                      className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      {showMobileSidebar ? (
                        <AiOutlineClose className="text-xl text-gray-600 dark:text-gray-400" />
                      ) : (
                        <AiOutlineMenu className="text-xl text-gray-600 dark:text-gray-400" />
                      )}
                    </button>

                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">F</span>
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{t('common.appName')}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">{t('common.welcome')}, {user.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <NotificationBell 
                      onTaskSelect={handleTaskSelect}
                      onProjectSelect={handleProjectSelect}
                    />
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      {isDark ? 
                        <AiOutlineSun className="text-lg sm:text-xl text-yellow-400" /> : 
                        <AiOutlineMoon className="text-lg sm:text-xl text-gray-600" />
                      }
                    </button>
                    
                    {/* User Menu */}
                    <div className="relative group">
                      <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block truncate max-w-24">
                          {user.name}
                        </span>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={logout}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          >
                            <FiLogOut className="w-4 h-4" />
                            <span>{t('common.signOut')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </header>

                {/* Compact Timer */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 transition-colors duration-200">
                  <CompactTimerCard
                    onExpand={() => setShowFloatingTimer(true)}
                  />
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-4 sm:p-6">
                  <div className="max-w-7xl mx-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/projects" element={<ProjectsPage />} />
                      <Route path="/schedule" element={<SchedulePage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </div>
                </main>
              </div>

              {/* Task Creation Modal */}
              <TaskFormModal
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                onSave={(task) => {
                  setTasks(prev => [task, ...prev]);
                  fetchTasks();
                }}
              />

              {/* Floating Timer */}
              {showFloatingTimer && (
                <FloatingTimer
                  onClose={() => setShowFloatingTimer(false)}
                />
              )}

              {/* Encouragement Modal */}
              {showEncouragement && completedTask && (
                <EncouragementModal
                  isOpen={showEncouragement}
                  onClose={() => {
                    setShowEncouragement(false);
                    setCompletedTask(null);
                  }}
                  taskId={completedTask.id}
                  taskTitle={completedTask.title}
                />
              )}

              {/* Overtime Notification Manager */}
              <OvertimeNotificationManager userId={user.id} />
              
              {/* Inactivity Manager */}
              <InactivityManager userId={user.id} />
              
              {/* Activity Tracker */}
              <ActivityTracker userId={user.id} />

              <ChatWidget />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;