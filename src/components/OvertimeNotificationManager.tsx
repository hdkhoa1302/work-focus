import React, { useState, useEffect } from 'react';
import { Task, Project, getConfig, Config, getTasks, getProjects } from '../services/api';
import OvertimeWarningModal from './OvertimeWarningModal';
import TaskOverdueNotification from './TaskOverdueNotification';
import DelayedTaskNotification from './DelayedTaskNotification';

interface OvertimeNotificationManagerProps {
  userId?: string;
}

interface OverdueItem {
  id: string;
  type: 'task' | 'project';
  title: string;
  daysOverdue: number;
  deadline: string;
  overtimeHours: number;
  acknowledged: boolean;
}

const OvertimeNotificationManager: React.FC<OvertimeNotificationManagerProps> = ({ userId }) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [currentOverdueItem, setCurrentOverdueItem] = useState<OverdueItem | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [acknowledgedItems, setAcknowledgedItems] = useState<Record<string, boolean>>({});
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // Load config and data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [configData, tasksData, projectsData] = await Promise.all([
          getConfig(),
          getTasks(),
          getProjects()
        ]);
        
        setConfig(configData);
        setTasks(tasksData);
        setProjects(projectsData);
        
        // Load acknowledged items from localStorage
        const savedAcknowledged = localStorage.getItem('acknowledgedOverdueItems');
        if (savedAcknowledged) {
          setAcknowledgedItems(JSON.parse(savedAcknowledged));
        }
        
        // Load last check time
        const savedLastCheckTime = localStorage.getItem('lastOverdueCheckTime');
        if (savedLastCheckTime) {
          setLastCheckTime(new Date(savedLastCheckTime));
        }
      } catch (error) {
        console.error('Failed to load data for overtime notifications:', error);
      }
    };
    
    loadData();
    
    // Set up interval to check for overdue items
    const intervalId = setInterval(() => {
      checkForOverdueItems();
    }, 30 * 60 * 1000); // Check every 30 minutes
    
    return () => clearInterval(intervalId);
  }, [userId]);

  // Check for overdue items when data changes
  useEffect(() => {
    if (config && tasks.length > 0 && projects.length > 0) {
      checkForOverdueItems();
    }
  }, [config, tasks, projects]);

  // Save acknowledged items to localStorage when they change
  useEffect(() => {
    localStorage.setItem('acknowledgedOverdueItems', JSON.stringify(acknowledgedItems));
  }, [acknowledgedItems]);

  // Check for overdue items
  const checkForOverdueItems = () => {
    if (!config) return;
    
    const now = new Date();
    const overdue: OverdueItem[] = [];
    
    // Check for overdue tasks
    tasks.forEach(task => {
      if (task.deadline && task.status !== 'done') {
        const deadline = new Date(task.deadline);
        if (deadline < now) {
          const daysOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
          
          // Calculate overtime hours needed
          const estimatedHours = (task.estimatedPomodoros || 1) * 25 / 60; // Convert pomodoros to hours
          const overtimeHours = calculateOvertimeHours(estimatedHours, daysOverdue, config.workSchedule);
          
          // Check if this item has been acknowledged
          const isAcknowledged = acknowledgedItems[`task-${task._id}`] || false;
          
          overdue.push({
            id: task._id,
            type: 'task',
            title: task.title,
            daysOverdue,
            deadline: task.deadline,
            overtimeHours,
            acknowledged: isAcknowledged
          });
        }
      }
    });
    
    // Check for overdue projects
    projects.forEach(project => {
      if (project.deadline && !project.completed) {
        const deadline = new Date(project.deadline);
        if (deadline < now) {
          const daysOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
          
          // Calculate overtime hours needed
          const estimatedHours = project.estimatedHours || 0;
          const actualHours = project.actualHours || 0;
          const remainingHours = Math.max(0, estimatedHours - actualHours);
          const overtimeHours = calculateOvertimeHours(remainingHours, daysOverdue, config.workSchedule);
          
          // Check if this item has been acknowledged
          const isAcknowledged = acknowledgedItems[`project-${project._id}`] || false;
          
          overdue.push({
            id: project._id,
            type: 'project',
            title: project.name,
            daysOverdue,
            deadline: project.deadline,
            overtimeHours,
            acknowledged: isAcknowledged
          });
        }
      }
    });
    
    setOverdueItems(overdue);
    
    // Show notification for the first unacknowledged item
    const unacknowledgedItem = overdue.find(item => !item.acknowledged);
    if (unacknowledgedItem) {
      // Only show notification if we haven't shown one in the last 2 hours
      const shouldShowNotification = !lastCheckTime || 
        (now.getTime() - lastCheckTime.getTime() > 2 * 60 * 60 * 1000);
      
      if (shouldShowNotification) {
        setCurrentOverdueItem(unacknowledgedItem);
        setShowNotification(true);
        setLastCheckTime(now);
        localStorage.setItem('lastOverdueCheckTime', now.toISOString());
      }
    }
  };

  // Calculate overtime hours needed
  const calculateOvertimeHours = (
    remainingHours: number,
    daysOverdue: number,
    workSchedule: Config['workSchedule']
  ): number => {
    // If not overdue, no overtime needed
    if (daysOverdue <= 0) return 0;
    
    // Calculate available working hours
    const workingDaysPerWeek = workSchedule.daysPerWeek;
    const hoursPerDay = workSchedule.hoursPerDay;
    
    // Calculate how many working days we have left
    const workingDaysLeft = Math.max(0, 1); // At least 1 day
    
    // Calculate available working hours
    const availableWorkingHours = workingDaysLeft * hoursPerDay;
    
    // If remaining hours > available hours, we need overtime
    if (remainingHours > availableWorkingHours) {
      return remainingHours - availableWorkingHours;
    }
    
    return 0;
  };

  // Handle notification acknowledgment
  const handleNotificationAcknowledge = () => {
    setShowNotification(false);
    
    if (currentOverdueItem) {
      setShowWarningModal(true);
    }
  };

  // Handle warning modal close
  const handleWarningModalClose = () => {
    if (currentOverdueItem) {
      // Mark the current item as acknowledged
      setAcknowledgedItems(prev => ({
        ...prev,
        [`${currentOverdueItem.type}-${currentOverdueItem.id}`]: true
      }));
    }
    
    setShowWarningModal(false);
    setCurrentOverdueItem(null);
  };

  // Get project name for a task
  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p._id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  return (
    <>
      {/* Notification for overdue tasks */}
      {showNotification && currentOverdueItem && (
        <TaskOverdueNotification
          isOpen={showNotification}
          onClose={handleNotificationAcknowledge}
          title={currentOverdueItem.title}
          daysOverdue={currentOverdueItem.daysOverdue}
          overtimeHours={currentOverdueItem.overtimeHours}
          type={currentOverdueItem.type}
          projectName={currentOverdueItem.type === 'task' 
            ? getProjectName(tasks.find(t => t._id === currentOverdueItem.id)?.projectId || '')
            : undefined
          }
        />
      )}

      {/* Warning modal for detailed information */}
      {showWarningModal && currentOverdueItem && (
        <OvertimeWarningModal
          isOpen={showWarningModal}
          onClose={handleWarningModalClose}
          overtimeHours={currentOverdueItem.overtimeHours}
          taskTitle={currentOverdueItem.type === 'task' ? currentOverdueItem.title : undefined}
          projectName={currentOverdueItem.type === 'project' ? currentOverdueItem.title : undefined}
          daysOverdue={currentOverdueItem.daysOverdue}
          deadlineDate={currentOverdueItem.deadline}
        />
      )}

      {/* Delayed Task Notification for tasks that are delayed but not yet overdue */}
      {tasks.some(task => 
        task.deadline && 
        task.status !== 'done' && 
        new Date(task.deadline) > new Date() && 
        new Date(task.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
      ) && (
        <DelayedTaskNotification 
          tasks={tasks.filter(task => 
            task.deadline && 
            task.status !== 'done' && 
            new Date(task.deadline) > new Date() && 
            new Date(task.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
          )}
          projects={projects}
        />
      )}
    </>
  );
};

export default OvertimeNotificationManager;