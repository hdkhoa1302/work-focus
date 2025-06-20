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
        // Initialize root store first (config, etc.)
        if (!initialized) {
          await initialize();
        }
        
        // Then fetch all data in parallel
        await Promise.all([
          fetchSessions(),
          fetchTasks(),
          fetchProjects(),
          fetchConversations()
        ]);
      } catch (error) {
        console.error('Failed to initialize app:', error);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer;