import React, { useState, useEffect } from 'react';
import InactivityWarningModal from './InactivityWarningModal';
import useNotificationStore from '../stores/notificationStore';

interface InactivityManagerProps {
  userId?: string;
}

const InactivityManager: React.FC<InactivityManagerProps> = ({ userId }) => {
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityData, setInactivityData] = useState<{
    inactiveMinutes: number;
    pendingTasks: Array<{ id: string; title: string }>;
    lastActivityTime: Date;
  } | null>(null);

  // Get notifications from store
  const notifications = useNotificationStore(state => state.notifications);
  const lastActivityTime = useNotificationStore(state => state.lastActivityTime);
  const updateActivityTime = useNotificationStore(state => state.updateActivityTime);

  useEffect(() => {
    if (!userId) return;

    // Check for inactivity warnings in notifications
    const inactivityNotification = notifications.find(
      n => n.type === 'inactivityWarning' && !n.read
    );

    if (inactivityNotification) {
      // Check if we've already shown a warning recently
      const lastShown = localStorage.getItem('lastInactivityWarningShown');
      if (lastShown) {
        const lastShownTime = new Date(lastShown);
        const now = new Date();
        const minutesSinceLastShown = (now.getTime() - lastShownTime.getTime()) / (1000 * 60);
        
        // Only show once every 25 minutes
        if (minutesSinceLastShown < 25) {
          return;
        }
      }
      
      // Calculate inactive time
      const now = new Date();
      const inactiveMinutes = lastActivityTime 
        ? Math.floor((now.getTime() - lastActivityTime.getTime()) / (1000 * 60))
        : 0;
      
      setInactivityData({
        inactiveMinutes,
        pendingTasks: [], // We would fetch these from the API in a real implementation
        lastActivityTime: lastActivityTime || now
      });
      
      setShowInactivityWarning(true);
      
      // Save the time we showed the warning
      localStorage.setItem('lastInactivityWarningShown', now.toISOString());
      
      // Mark the notification as read
      useNotificationStore.getState().markAsRead(inactivityNotification.id);
    }
  }, [notifications, userId, lastActivityTime]);

  const handleCloseInactivityWarning = () => {
    setShowInactivityWarning(false);
    setInactivityData(null);
    
    // Update activity time
    updateActivityTime();
  };

  return (
    <>
      {showInactivityWarning && inactivityData && (
        <InactivityWarningModal
          isOpen={showInactivityWarning}
          onClose={handleCloseInactivityWarning}
          inactiveMinutes={inactivityData.inactiveMinutes}
          pendingTasks={inactivityData.pendingTasks}
          lastActivityTime={inactivityData.lastActivityTime}
        />
      )}
    </>
  );
};

export default InactivityManager;