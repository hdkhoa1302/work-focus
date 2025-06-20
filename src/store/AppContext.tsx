import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Task, Project, Session, getProjects, getTasks, getSessions } from '../services/api';

// Types
interface TimerState {
  remaining: number;
  mode: 'focus' | 'break';
  isRunning: boolean;
  selectedTaskId: string | null;
  selectedProjectId: string | null;
  config: {
    focus: number;
    break: number;
  };
}

interface AppState {
  timer: TimerState;
  projects: Project[];
  tasks: Task[];
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
}

// Action Types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_SESSIONS'; payload: Session[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_SESSION'; payload: Session }
  | { type: 'TIMER_SET_REMAINING'; payload: number }
  | { type: 'TIMER_SET_MODE'; payload: 'focus' | 'break' }
  | { type: 'TIMER_SET_RUNNING'; payload: boolean }
  | { type: 'TIMER_SET_SELECTED_TASK'; payload: string | null }
  | { type: 'TIMER_SET_SELECTED_PROJECT'; payload: string | null }
  | { type: 'TIMER_SET_CONFIG'; payload: { focus: number; break: number } }
  | { type: 'TIMER_RESET' }
  | { type: 'REFRESH_DATA' };

// Initial State
const initialState: AppState = {
  timer: {
    remaining: 25 * 60 * 1000, // 25 minutes in milliseconds
    mode: 'focus',
    isRunning: false,
    selectedTaskId: null,
    selectedProjectId: null,
    config: {
      focus: 25,
      break: 5,
    },
  },
  projects: [],
  tasks: [],
  sessions: [],
  isLoading: false,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };

    case 'SET_TASKS':
      return { ...state, tasks: action.payload };

    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };

    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects] };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project._id === action.payload.id
            ? { ...project, ...action.payload.updates }
            : project
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project._id !== action.payload),
        tasks: state.tasks.filter(task => task.projectId !== action.payload),
      };

    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task._id === action.payload.id
            ? { ...task, ...action.payload.updates }
            : task
        ),
      };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task._id !== action.payload),
      };

    case 'ADD_SESSION':
      return { ...state, sessions: [action.payload, ...state.sessions] };

    case 'TIMER_SET_REMAINING':
      return {
        ...state,
        timer: { ...state.timer, remaining: action.payload },
      };

    case 'TIMER_SET_MODE':
      return {
        ...state,
        timer: { ...state.timer, mode: action.payload },
      };

    case 'TIMER_SET_RUNNING':
      return {
        ...state,
        timer: { ...state.timer, isRunning: action.payload },
      };

    case 'TIMER_SET_SELECTED_TASK':
      return {
        ...state,
        timer: { ...state.timer, selectedTaskId: action.payload },
      };

    case 'TIMER_SET_SELECTED_PROJECT':
      return {
        ...state,
        timer: { ...state.timer, selectedProjectId: action.payload },
      };

    case 'TIMER_SET_CONFIG':
      return {
        ...state,
        timer: { 
          ...state.timer, 
          config: action.payload,
          remaining: action.payload.focus * 60 * 1000 // Reset remaining time when config changes
        },
      };

    case 'TIMER_RESET':
      return {
        ...state,
        timer: {
          ...state.timer,
          remaining: state.timer.config.focus * 60 * 1000,
          isRunning: false,
          mode: 'focus',
        },
      };

    case 'REFRESH_DATA':
      // This will trigger a data refresh in the provider
      return state;

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Timer actions
  startTimer: (taskId?: string, projectId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setTimerConfig: (config: { focus: number; break: number }) => void;
  
  // Data actions
  refreshData: () => Promise<void>;
  
  // Computed values
  getTaskProgress: (taskId: string) => { completed: number; estimated: number; percentage: number };
  getProjectTasks: (projectId: string) => Task[];
  getActiveProject: () => Project | null;
  getSelectedTask: () => Task | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  // Listen to IPC events for timer updates
  useEffect(() => {
    const handleTimerTick = (_: any, remaining: number) => {
      dispatch({ type: 'TIMER_SET_REMAINING', payload: remaining });
    };

    const handleTimerDone = (_: any, { type }: { type: 'focus' | 'break' }) => {
      dispatch({ type: 'TIMER_SET_RUNNING', payload: false });
      
      if (type === 'focus') {
        // Switch to break mode
        dispatch({ type: 'TIMER_SET_MODE', payload: 'break' });
        dispatch({ type: 'TIMER_SET_REMAINING', payload: state.timer.config.break * 60 * 1000 });
      } else {
        // Switch back to focus mode
        dispatch({ type: 'TIMER_SET_MODE', payload: 'focus' });
        dispatch({ type: 'TIMER_SET_REMAINING', payload: state.timer.config.focus * 60 * 1000 });
      }
      
      // Refresh data after session completion
      refreshData();
    };

    const handleTimerPaused = (_: any, remaining: number) => {
      dispatch({ type: 'TIMER_SET_RUNNING', payload: false });
      dispatch({ type: 'TIMER_SET_REMAINING', payload: remaining });
    };

    // Set up IPC listeners
    if (window.ipc) {
      window.ipc.on('timer-tick', handleTimerTick);
      window.ipc.on('timer-done', handleTimerDone);
      window.ipc.on('timer-paused', handleTimerPaused);
    }

    return () => {
      if (window.ipc) {
        window.ipc.removeListener('timer-tick', handleTimerTick);
        window.ipc.removeListener('timer-done', handleTimerDone);
        window.ipc.removeListener('timer-paused', handleTimerPaused);
      }
    };
  }, [state.timer.config]);

  // Listen to custom events
  useEffect(() => {
    const handleStartTask = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.taskId) {
        startTimer(detail.taskId, detail.projectId);
      }
    };

    const handleTasksUpdated = () => {
      refreshData();
    };

    const handleCreateTask = () => {
      // This event is handled by the modal component
    };

    const handleTaskCompleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Update task status to completed
      if (detail.taskId) {
        dispatch({
          type: 'UPDATE_TASK',
          payload: { id: detail.taskId, updates: { status: 'done' } }
        });
      }
      refreshData();
    };

    window.addEventListener('start-task', handleStartTask);
    window.addEventListener('tasks-updated', handleTasksUpdated);
    window.addEventListener('create-task', handleCreateTask);
    window.addEventListener('task-completed', handleTaskCompleted);

    return () => {
      window.removeEventListener('start-task', handleStartTask);
      window.removeEventListener('tasks-updated', handleTasksUpdated);
      window.removeEventListener('create-task', handleCreateTask);
      window.removeEventListener('task-completed', handleTaskCompleted);
    };
  }, []);

  // Actions
  const refreshData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const [projectsData, tasksData, sessionsData] = await Promise.all([
        getProjects(),
        getTasks(),
        getSessions(),
      ]);

      dispatch({ type: 'SET_PROJECTS', payload: projectsData });
      dispatch({ type: 'SET_TASKS', payload: tasksData });
      dispatch({ type: 'SET_SESSIONS', payload: sessionsData });
    } catch (error) {
      console.error('Failed to refresh data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const startTimer = (taskId?: string, projectId?: string) => {
    if (taskId) {
      dispatch({ type: 'TIMER_SET_SELECTED_TASK', payload: taskId });
    }
    if (projectId) {
      dispatch({ type: 'TIMER_SET_SELECTED_PROJECT', payload: projectId });
    }

    dispatch({ type: 'TIMER_SET_RUNNING', payload: true });

    // Send IPC message to start timer
    if (window.ipc) {
      const duration = state.timer.mode === 'focus' 
        ? state.timer.config.focus * 60 * 1000 
        : state.timer.config.break * 60 * 1000;

      window.ipc.send('timer-start', {
        type: state.timer.mode,
        duration: state.timer.remaining || duration,
        taskId: state.timer.mode === 'focus' ? (taskId || state.timer.selectedTaskId) : undefined,
      });
    }
  };

  const pauseTimer = () => {
    dispatch({ type: 'TIMER_SET_RUNNING', payload: false });
    if (window.ipc) {
      window.ipc.send('timer-pause');
    }
  };

  const resumeTimer = () => {
    dispatch({ type: 'TIMER_SET_RUNNING', payload: true });
    if (window.ipc) {
      window.ipc.send('timer-resume');
    }
  };

  const resetTimer = () => {
    dispatch({ type: 'TIMER_RESET' });
    if (window.ipc) {
      window.ipc.send('timer-pause'); // Stop current timer
    }
  };

  const setTimerConfig = (config: { focus: number; break: number }) => {
    dispatch({ type: 'TIMER_SET_CONFIG', payload: config });
  };

  // Computed values
  const getTaskProgress = (taskId: string) => {
    const taskSessions = state.sessions.filter(s => s.taskId === taskId && s.type === 'focus');
    const completed = taskSessions.length;
    const task = state.tasks.find(t => t._id === taskId);
    const estimated = task?.estimatedPomodoros || 1;
    const percentage = Math.min((completed / estimated) * 100, 100);
    
    return { completed, estimated, percentage };
  };

  const getProjectTasks = (projectId: string) => {
    return state.tasks.filter(task => task.projectId === projectId);
  };

  const getActiveProject = () => {
    if (!state.timer.selectedProjectId) return null;
    return state.projects.find(p => p._id === state.timer.selectedProjectId) || null;
  };

  const getSelectedTask = () => {
    if (!state.timer.selectedTaskId) return null;
    return state.tasks.find(t => t._id === state.timer.selectedTaskId) || null;
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTimerConfig,
    refreshData,
    getTaskProgress,
    getProjectTasks,
    getActiveProject,
    getSelectedTask,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};

export default AppContext;