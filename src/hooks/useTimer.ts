import { useAppStore } from '../store/AppContext';

export const useTimer = () => {
  const { state, startTimer, pauseTimer, resumeTimer, resetTimer, setTimerConfig } = useAppStore();
  
  const { timer } = state;
  
  // Helper functions
  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((milliseconds / 1000) % 60).toString().padStart(2, '0');
    return { minutes, seconds, formatted: `${minutes}:${seconds}` };
  };

  const getProgress = () => {
    const totalDuration = timer.mode === 'focus' 
      ? timer.config.focus * 60 * 1000 
      : timer.config.break * 60 * 1000;
    const elapsed = totalDuration - timer.remaining;
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  const canStart = () => {
    if (timer.mode === 'break') return true;
    return timer.selectedTaskId !== null;
  };

  const switchMode = (mode: 'focus' | 'break') => {
    if (timer.isRunning) return false; // Can't switch while running
    
    const duration = mode === 'focus' 
      ? timer.config.focus * 60 * 1000 
      : timer.config.break * 60 * 1000;
    
    // This would need to be implemented in the context
    // For now, we'll use the existing actions
    return true;
  };

  return {
    // State
    remaining: timer.remaining,
    mode: timer.mode,
    isRunning: timer.isRunning,
    selectedTaskId: timer.selectedTaskId,
    selectedProjectId: timer.selectedProjectId,
    config: timer.config,
    
    // Actions
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    reset: resetTimer,
    setConfig: setTimerConfig,
    
    // Computed values
    timeDisplay: formatTime(timer.remaining),
    progress: getProgress(),
    canStart: canStart(),
    
    // Helper functions
    formatTime,
    switchMode,
  };
};