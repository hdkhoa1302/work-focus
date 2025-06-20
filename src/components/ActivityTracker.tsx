import React, { useEffect } from 'react';
import useNotificationStore from '../stores/notificationStore';
import useTimerStore from '../stores/timerStore';
import { createInactivityNotification } from './NotificationService';

interface ActivityTrackerProps {
  userId?: string;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ userId }) => {
  const updateActivityTime = useNotificationStore(state => state.updateActivityTime);
  const lastActivityTime = useNotificationStore(state => state.lastActivityTime);
  const checkInactivity = useTimerStore(state => state.checkInactivity);
  
  // Track user activity
  useEffect(() => {
    if (!userId) return;
    
    const handleActivity = () => {
      updateActivityTime();
    };
    
    // Track user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    
    // Set up periodic inactivity checks
    const checkInterval = setInterval(() => {
      checkInactivity();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(checkInterval);
    };
  }, [userId, updateActivityTime, checkInactivity]);
  
  // Initial activity update
  useEffect(() => {
    if (userId) {
      updateActivityTime();
    }
  }, [userId, updateActivityTime]);
  
  // This component doesn't render anything
  return null;
};

export default ActivityTracker;