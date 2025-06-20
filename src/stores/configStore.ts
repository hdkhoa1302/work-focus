import { create } from 'zustand';
import { getConfig, saveConfig, Config } from '../services/api';

interface ConfigState {
  config: Config;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchConfig: () => Promise<void>;
  updateConfig: (newConfig: Partial<Config>) => Promise<void>;
  
  // Computed
  getEffectiveWorkHours: () => number;
}

const defaultConfig: Config = {
  pomodoro: { focus: 25, break: 5 },
  blockList: { hosts: [], apps: [] },
  notifications: { enabled: true, sound: true },
  workSchedule: {
    hoursPerDay: 8,
    daysPerWeek: 5,
    startTime: '09:00',
    endTime: '17:00',
    breakHours: 1,
    overtimeRate: 1.5
  }
};

const useConfigStore = create<ConfigState>((set, get) => ({
  config: defaultConfig,
  isLoading: false,
  error: null,
  
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await getConfig();
      set({ config, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch config:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch config', 
        isLoading: false 
      });
    }
  },
  
  updateConfig: async (newConfig: Partial<Config>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedConfig = { ...get().config, ...newConfig };
      await saveConfig(updatedConfig);
      set({ config: updatedConfig, isLoading: false });
    } catch (error) {
      console.error('Failed to update config:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update config', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Computed values
  getEffectiveWorkHours: () => {
    const { hoursPerDay, breakHours } = get().config.workSchedule;
    return hoursPerDay - breakHours;
  }
}));

// Initialize config when the store is first used
useConfigStore.getState().fetchConfig();

export default useConfigStore;