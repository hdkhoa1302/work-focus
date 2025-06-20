import { create } from 'zustand';
import { getSessions, Session } from '../services/api';

interface SessionState {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchSessions: () => Promise<void>;
  
  // Computed
  getSessionsByTask: (taskId: string) => Session[];
  getFocusSessions: () => Session[];
  getBreakSessions: () => Session[];
  getTodaySessions: () => Session[];
  getTotalFocusTime: () => number; // in minutes
}

const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  isLoading: false,
  error: null,
  
  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await getSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sessions', 
        isLoading: false 
      });
    }
  },
  
  // Computed values
  getSessionsByTask: (taskId: string) => {
    return get().sessions.filter(s => s.taskId === taskId);
  },
  
  getFocusSessions: () => {
    return get().sessions.filter(s => s.type === 'focus');
  },
  
  getBreakSessions: () => {
    return get().sessions.filter(s => s.type === 'break');
  },
  
  getTodaySessions: () => {
    const today = new Date().toDateString();
    return get().sessions.filter(s => 
      new Date(s.startTime).toDateString() === today
    );
  },
  
  getTotalFocusTime: () => {
    const focusSessions = get().getFocusSessions();
    const totalSeconds = focusSessions.reduce((total, s) => total + (s.duration || 0), 0);
    return Math.round(totalSeconds / 60); // Convert to minutes
  }
}));

export default useSessionStore;