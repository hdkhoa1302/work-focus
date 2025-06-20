import { create } from 'zustand';
import { getConfig } from '../services/api';

export type TimerMode = 'focus' | 'break';

interface TimerState {
  // Timer state
  remaining: number;
  mode: TimerMode;
  isRunning: boolean;
  selectedTaskId: string | undefined;
  selectedProjectId: string | undefined;
  selectedTaskTitle: string | undefined;
  
  // Timer config
  config: {
    focus: number;
    break: number;
  };
  
  // Actions
  startTimer: (options?: { taskId?: string; projectId?: string; taskTitle?: string }) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (mode?: TimerMode) => void;
  setMode: (mode: TimerMode) => void;
  setRemaining: (ms: number) => void;
  setIsRunning: (isRunning: boolean) => void;
  setSelectedTask: (taskId?: string, projectId?: string, taskTitle?: string) => void;
  
  // Initialization
  initializeConfig: () => Promise<void>;
}

const useTimerStore = create<TimerState>((set, get) => ({
  // Initial state
  remaining: 25 * 60 * 1000, // 25 minutes in milliseconds
  mode: 'focus',
  isRunning: false,
  selectedTaskId: undefined,
  selectedProjectId: undefined,
  selectedTaskTitle: undefined,
  
  config: {
    focus: 25,
    break: 5
  },
  
  // Actions
  startTimer: (options = {}) => {
    const { mode, config } = get();
    const { taskId, projectId, taskTitle } = options;
    
    // In focus mode, we need a task selected
    if (mode === 'focus' && !taskId && !get().selectedTaskId) {
      console.warn('Không thể bắt đầu timer focus mà không có task được chọn');
      return;
    }
    
    // Set selected task if provided
    if (taskId || projectId) {
      set({ 
        selectedTaskId: taskId || get().selectedTaskId,
        selectedProjectId: projectId || get().selectedProjectId,
        selectedTaskTitle: taskTitle || get().selectedTaskTitle
      });
    }
    
    // Calculate duration based on mode
    const duration = config[mode] * 60 * 1000;
    
    // Set state
    set({ isRunning: true, remaining: duration });
    
    // Send IPC message to main process
    window.ipc?.send('timer-start', {
      type: mode,
      duration,
      taskId: taskId || get().selectedTaskId
    });
    
    // Update activity time
    window.ipc?.send('user-activity');
  },
  
  pauseTimer: () => {
    window.ipc?.send('timer-pause');
    set({ isRunning: false });
  },
  
  resumeTimer: () => {
    set({ isRunning: true });
    window.ipc?.send('timer-resume');
    window.ipc?.send('user-activity');
  },
  
  resetTimer: (mode) => {
    const newMode = mode || get().mode;
    const duration = get().config[newMode] * 60 * 1000;
    set({ 
      mode: newMode,
      remaining: duration,
      isRunning: false
    });
  },
  
  setMode: (mode) => {
    if (get().isRunning) {
      console.warn('Không thể thay đổi mode khi timer đang chạy');
      return;
    }
    
    const duration = get().config[mode] * 60 * 1000;
    set({ 
      mode,
      remaining: duration
    });
  },
  
  setRemaining: (ms) => {
    set({ remaining: ms });
  },
  
  setIsRunning: (isRunning) => {
    set({ isRunning });
  },
  
  setSelectedTask: (taskId, projectId, taskTitle) => {
    set({ 
      selectedTaskId: taskId,
      selectedProjectId: projectId,
      selectedTaskTitle: taskTitle
    });
  },
  
  initializeConfig: async () => {
    try {
      const data = await getConfig();
      if (data.pomodoro) {
        set({ 
          config: data.pomodoro,
          remaining: data.pomodoro.focus * 60 * 1000
        });
      }
    } catch (error) {
      console.error('Failed to fetch timer config:', error);
    }
  }
}));

// Setup IPC listeners
if (typeof window !== 'undefined' && window.ipc) {
  // Listen for timer events from main process
  window.ipc.on('timer-tick', (_, ms: number) => {
    useTimerStore.getState().setRemaining(ms);
  });
  
  window.ipc.on('timer-done', (_, { type }: { type: TimerMode }) => {
    const store = useTimerStore.getState();
    store.setIsRunning(false);
    
    // Switch to the other mode
    const newMode = type === 'focus' ? 'break' : 'focus';
    const duration = store.config[newMode] * 60 * 1000;
    
    store.setMode(newMode);
    store.setRemaining(duration);
    
    // Update activity time
    window.ipc?.send('user-activity');
  });
  
  window.ipc.on('timer-paused', (_, ms: number) => {
    const store = useTimerStore.getState();
    store.setIsRunning(false);
    store.setRemaining(ms);
  });
}

// Initialize config when the store is first used
useTimerStore.getState().initializeConfig();

export default useTimerStore;