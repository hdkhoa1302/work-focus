import React, { useState, useEffect } from 'react';
import InactivityWarningModal from './InactivityWarningModal';

interface InactivityManagerProps {
  userId?: string;
}

const InactivityManager: React.FC<InactivityManagerProps> = ({ userId }) => {
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityData, setInactivityData] = useState<{
    inactiveHours: number;
    pendingTasks: Array<{ id: string; title: string }>;
    lastActivityTime: Date;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Listen for inactivity warnings from main process
    const handleInactivityWarning = (event: any, notification: any) => {
      if (notification.type === 'inactivityWarning') {
        // Check if we've already shown a warning recently
        const lastShown = localStorage.getItem('lastInactivityWarningShown');
        if (lastShown) {
          const lastShownTime = new Date(lastShown);
          const now = new Date();
          const hoursSinceLastShown = (now.getTime() - lastShownTime.getTime()) / (1000 * 60 * 60);
          
          // Only show once every 4 hours
          if (hoursSinceLastShown < 4) {
            return;
          }
        }
        
        setInactivityData({
          inactiveHours: notification.data.inactiveHours,
          pendingTasks: notification.data.pendingTasks || [],
          lastActivityTime: new Date(notification.data.inactiveSince)
        });
        setShowInactivityWarning(true);
        
        // Save the time we showed the warning
        localStorage.setItem('lastInactivityWarningShown', new Date().toISOString());
      }
    };

    window.ipc?.on('new-notification', handleInactivityWarning);

    // Also listen for check-inactivity events
    const handleCheckInactivity = () => {
      // This would typically check with the server or local storage
      // For now, we'll just check the last activity time from localStorage
      const lastActivityTime = localStorage.getItem(`lastActivityTime_${userId}`);
      if (lastActivityTime) {
        const lastActivity = new Date(lastActivityTime);
        const now = new Date();
        const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        // Get inactivity threshold from config or use default
        const configStr = localStorage.getItem('notificationConfig');
        const config = configStr ? JSON.parse(configStr) : null;
        const threshold = config?.inactivityThreshold || 4; // Default 4 hours
        
        if (diffHours >= threshold) {
          // Check if we've already shown a warning recently
          const lastShown = localStorage.getItem('lastInactivityWarningShown');
          if (lastShown) {
            const lastShownTime = new Date(lastShown);
            const hoursSinceLastShown = (now.getTime() - lastShownTime.getTime()) / (1000 * 60 * 60);
            
            // Only show once every threshold hours
            if (hoursSinceLastShown < threshold) {
              return;
            }
          }
          
          // Show inactivity warning
          setInactivityData({
            inactiveHours: Math.floor(diffHours),
            pendingTasks: [], // We would fetch these from the API in a real implementation
            lastActivityTime: lastActivity
          });
          setShowInactivityWarning(true);
          
          // Save the time we showed the warning
          localStorage.setItem('lastInactivityWarningShown', now.toISOString());
        }
      }
    };

    window.ipc?.on('check-inactivity', handleCheckInactivity);

    // Update activity time when user interacts with the app
    const updateActivity = () => {
      window.ipc?.send('user-activity');
    };

    // Track user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.ipc?.removeListener('new-notification', handleInactivityWarning);
      window.ipc?.removeListener('check-inactivity', handleCheckInactivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [userId]);

  const handleCloseInactivityWarning = () => {
    setShowInactivityWarning(false);
    setInactivityData(null);
    
    // Update activity time
    window.ipc?.send('user-activity');
  };

  return (
    <>
      {showInactivityWarning && inactivityData && (
        <InactivityWarningModal
          isOpen={showInactivityWarning}
          onClose={handleCloseInactivityWarning}
          inactiveHours={inactivityData.inactiveHours}
          pendingTasks={inactivityData.pendingTasks}
          lastActivityTime={inactivityData.lastActivityTime}
        />
      )}
    </>
  );
};

export default InactivityManager;