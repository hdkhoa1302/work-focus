import React, { useEffect, useState } from 'react';
import { useRootStore } from '../stores/rootStore';
import useSessionStore from '../stores/sessionStore';
import useTaskStore from '../stores/taskStore';
import useProjectStore from '../stores/projectStore';
import useConversationStore from '../stores/conversationStore';

// This component handles initializing all stores and data
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, initialize } = useRootStore();
  const fetchSessions = useSessionStore(state => state.fetchSessions);
  const fetchTasks = useTaskStore(state => state.fetchTasks);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const fetchConversations = useConversationStore(state => state.fetchConversations);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Bắt đầu khởi tạo ứng dụng...');
        
        // Initialize root store first (config, etc.)
        if (!initialized) {
          console.log('⚙️ Khởi tạo root store...');
          await initialize();
        }
        
        // Then fetch all data with individual error handling
        console.log('📊 Đang tải dữ liệu...');
        const dataPromises = [
          fetchSessions().catch(err => console.warn('⚠️ Lỗi tải sessions:', err)),
          fetchTasks().catch(err => console.warn('⚠️ Lỗi tải tasks:', err)),
          fetchProjects().catch(err => console.warn('⚠️ Lỗi tải projects:', err)),
          fetchConversations().catch(err => console.warn('⚠️ Lỗi tải conversations:', err))
        ];
        
        // Wait for all with timeout
        await Promise.race([
          Promise.all(dataPromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
          )
        ]);
        
        console.log('✅ Khởi tạo ứng dụng thành công!');
      } catch (error) {
        console.error('❌ Lỗi khởi tạo ứng dụng:', error);
        // Continue anyway - don't block the app
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, [initialize, initialized, fetchSessions, fetchTasks, fetchProjects, fetchConversations]);

  // Setup event listeners for data updates
  useEffect(() => {
    const handleTasksUpdated = () => {
      fetchTasks();
    };
    
    const handleTimerDone = () => {
      fetchSessions();
      fetchTasks();
    };
    
    window.addEventListener('tasks-updated', handleTasksUpdated);
    window.ipc?.on('timer-done', handleTimerDone);
    
    return () => {
      window.removeEventListener('tasks-updated', handleTasksUpdated);
      window.ipc?.removeListener('timer-done', handleTimerDone);
    };
  }, [fetchTasks, fetchSessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Đang khởi tạo Work Focus...
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Đang tải dữ liệu của bạn...
          </p>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            Nếu quá trình này mất quá lâu, hãy kiểm tra kết nối mạng
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer;