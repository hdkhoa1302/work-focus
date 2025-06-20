import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useProjectStore from './projectStore';
import useTaskStore from './taskStore';
import useTimerStore from './timerStore';
import useNotificationStore from './notificationStore';
import useWhiteboardStore from './whiteboardStore';
import useConfigStore from './configStore';

// Root store that combines all other stores
interface RootState {
  // Initialization status
  initialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
}

const useRootStore = create<RootState>((set, get) => ({
  initialized: false,
  
  initialize: async () => {
    try {
      // Initialize all stores in parallel
      await Promise.all([
        useConfigStore.getState().fetchConfig(),
        useProjectStore.getState().fetchProjects(),
        useTimerStore.getState().initializeConfig(),
        useNotificationStore.getState().fetchConfig()
      ]);
      
      set({ initialized: true });
    } catch (error) {
      console.error('Failed to initialize stores:', error);
      // Still mark as initialized to prevent infinite loading
      set({ initialized: true });
    }
  }
}));

// Initialize stores when this module is first imported
useRootStore.getState().initialize();

export {
  useRootStore,
  useProjectStore,
  useTaskStore,
  useTimerStore,
  useNotificationStore,
  useWhiteboardStore,
  useConfigStore
};