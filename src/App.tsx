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
import NotificationBell from './components/NotificationBell';
import useLanguage from './hooks/useLanguage';
import ActivityTracker from './components/ActivityTracker';
import AppInitializer from './components/AppInitializer';
import useStores from './hooks/useStores';

function AppContent() {
  const { t } = useLanguage();
  const { user, logout, isLoading } = useAuth();
  const { uiStore, taskStore, timerStore } = useStores();
  
  const { 
    isDarkMode, 
    toggleDarkMode, 
    isSidebarOpen, 
    toggleSidebar, 
    closeSidebar,
    isFloatingTimerOpen,
    toggleFloatingTimer,
    selectedTaskId,
    setSelectedTaskId
  } = uiStore();
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [completedTask, setCompletedTask] = useState<{ id: string; title: string } | null>(null);
  
  // Use timer store
  const { setSelectedTask } = timerStore;

  useEffect(() => {
    // Thêm listener cho sự kiện start-task từ Dashboard/TasksPage
    const onStartTaskEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      handleStartTask(detail.taskId);
    };
    window.addEventListener('start-task', onStartTaskEvent);
    return () => {
      window.removeEventListener('start-task', onStartTaskEvent);
    };
  }, []);

  useEffect(() => {
    // Thêm listener cho sự kiện create-task để mở modal tạo công việc
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
    };
    window.addEventListener('task-completed', onTaskCompleted);
    return () => {
      window.removeEventListener('task-completed', onTaskCompleted);
    };
  }, []);

  const handleStartTask = (taskId: string) => {
    const task = taskStore.getTaskById(taskId);
    if (task) {
      setSelectedTask(taskId, task.projectId, task.title);
      timerStore.startTimer({
        taskId,
        projectId: task.projectId,
        taskTitle: task.title
      });
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    window.dispatchEvent(new CustomEvent('view-task-detail', { 
      detail: { taskId }
    }));
  };

  const handleProjectSelect = (projectId: string) => {
    // Navigate to project page and select the project
    window.location.href = `/projects?id=${projectId}`;
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
              {isSidebarOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" />
              )}

              {/* Sidebar */}
              <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:transition-none`}>
                <Sidebar onClose={closeSidebar} />
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between transition-colors duration-200">
                  <div className="flex items-center space-x-4 min-w-0">
                    {/* Mobile Menu Button */}
                    <button
                      onClick={toggleSidebar}
                      className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      {isSidebarOpen ? (
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
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
                      onClick={toggleDarkMode}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      {isDarkMode ? 
                        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg> : 
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
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
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
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
                    onExpand={toggleFloatingTimer}
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
                  taskStore.fetchTasks();
                  setShowTaskModal(false);
                }}
              />

              {/* Floating Timer */}
              {isFloatingTimerOpen && (
                <FloatingTimer
                  onClose={toggleFloatingTimer}
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
      <AppInitializer>
        <AppContent />
      </AppInitializer>
    </AuthProvider>
  );
}

export default App;