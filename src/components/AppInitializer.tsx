import React, { useEffect, useState } from 'react';
import { useRootStore } from '../stores/rootStore';
import useSessionStore from '../stores/sessionStore';
import useTaskStore from '../stores/taskStore';
import useProjectStore from '../stores/projectStore';
import useConversationStore from '../stores/conversationStore';
import { testApiConnection } from '../services/api';

// This component handles initializing all stores and data
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, initialize } = useRootStore();
  const fetchSessions = useSessionStore(state => state.fetchSessions);
  const fetchTasks = useTaskStore(state => state.fetchTasks);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const fetchConversations = useConversationStore(state => state.fetchConversations);
  
  const [apiStatus, setApiStatus] = useState<{
    connected: boolean;
    apiUrl: string;
    error?: string;
    testing: boolean;
  }>({
    connected: false,
    apiUrl: '',
    error: undefined,
    testing: true
  });

  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Auto-hide success notification after 3 seconds
  useEffect(() => {
    if (apiStatus.connected && !apiStatus.testing) {
      setShowSuccessNotification(true);
      const timer = setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [apiStatus.connected, apiStatus.testing]);

  // Test API connection on startup
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🌐 Testing API connection...');
        setApiStatus(prev => ({ ...prev, testing: true }));
        
        const result = await testApiConnection();
        
        setApiStatus({
          connected: result.success,
          apiUrl: result.apiUrl,
          error: result.error,
          testing: false
        });
        
        if (result.success) {
          console.log('✅ API connection successful:', result);
        } else {
          console.warn('⚠️ API connection failed:', result.error);
        }
      } catch (error) {
        console.error('❌ API connection test error:', error);
        setApiStatus({
          connected: false,
          apiUrl: 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          testing: false
        });
      }
    };
    
    testConnection();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Bắt đầu khởi tạo ứng dụng...');
        
        // Initialize root store first (config, etc.)
        if (!initialized) {
          console.log('⚙️ Khởi tạo root store...');
          await initialize();
        }
        
        // Wait for API connection test to complete before loading data
        if (!apiStatus.testing && apiStatus.connected) {
          console.log('📊 API đã sẵn sàng, đang tải dữ liệu trong background...');
          const dataPromises = [
            fetchSessions().catch(err => console.warn('⚠️ Lỗi tải sessions:', err)),
            fetchTasks().catch(err => console.warn('⚠️ Lỗi tải tasks:', err)),
            fetchProjects().catch(err => console.warn('⚠️ Lỗi tải projects:', err)),
            fetchConversations().catch(err => console.warn('⚠️ Lỗi tải conversations:', err))
          ];
          
          // Load in background - don't wait
          Promise.all(dataPromises).then(() => {
            console.log('✅ Dữ liệu đã được tải trong background!');
          }).catch(error => {
            console.error('❌ Lỗi tải dữ liệu background:', error);
          });
        } else if (!apiStatus.testing && !apiStatus.connected) {
          console.warn('⚠️ API không khả dụng, ứng dụng có thể không hoạt động đầy đủ');
        }
        
        console.log('✅ Khởi tạo ứng dụng thành công!');
      } catch (error) {
        console.error('❌ Lỗi khởi tạo ứng dụng:', error);
        // Continue anyway - don't block the app
      }
    };
    
    // Only initialize after API test is complete
    if (!apiStatus.testing) {
      initializeApp();
    }
  }, [initialize, initialized, fetchSessions, fetchTasks, fetchProjects, fetchConversations, apiStatus.testing, apiStatus.connected]);

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
    (window as any).ipc?.on('timer-done', handleTimerDone);
    
    return () => {
      window.removeEventListener('tasks-updated', handleTasksUpdated);
      (window as any).ipc?.removeListener('timer-done', handleTimerDone);
    };
  }, [fetchTasks, fetchSessions]);

  // Always render children - no loading screen
  return (
    <>
      {/* API Connection Status - chỉ hiển thị khi có vấn đề */}
      {(!apiStatus.connected && !apiStatus.testing) && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
            <div>
              <div className="font-medium">Lỗi kết nối API</div>
              <div className="text-sm opacity-90">
                {apiStatus.error || 'Không thể kết nối đến server'}
              </div>
              <div className="text-xs opacity-75 mt-1">
                URL: {apiStatus.apiUrl}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success notification - tự động ẩn sau 3s */}
      {(showSuccessNotification && apiStatus.connected && !apiStatus.testing) && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
            <div>
              <div className="font-medium">API kết nối thành công</div>
              <div className="text-xs opacity-75">
                {apiStatus.apiUrl}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </>
  );
};

export default AppInitializer;