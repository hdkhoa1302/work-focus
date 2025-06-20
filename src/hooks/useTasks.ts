import { useAppStore } from '../store/AppContext';
import { createTask, updateTask, deleteTask } from '../services/api';

export const useTasks = () => {
  const { state, dispatch, getTaskProgress, refreshData } = useAppStore();
  
  const { tasks, isLoading, error } = state;

  // Actions
  const addTask = async (taskData: {
    projectId: string;
    title: string;
    description?: string;
    priority?: number;
    estimatedPomodoros?: number;
    deadline?: string;
    tags?: string[];
  }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newTask = await createTask(taskData);
      dispatch({ type: 'ADD_TASK', payload: newTask });
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create task' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const editTask = async (id: string, updates: Partial<{
    title: string;
    description: string;
    priority: number;
    status: 'todo' | 'in-progress' | 'done';
    estimatedPomodoros: number;
    deadline: string;
    tags: string[];
  }>) => {
    try {
      const updatedTask = await updateTask(id, updates);
      dispatch({ type: 'UPDATE_TASK', payload: { id, updates: updatedTask } });
      
      // Trigger task completed event if status changed to done
      if (updates.status === 'done') {
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: { taskId: id, taskTitle: updatedTask.title }
        }));
      }
      
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update task' });
      throw error;
    }
  };

  const removeTask = async (id: string) => {
    try {
      await deleteTask(id);
      dispatch({ type: 'DELETE_TASK', payload: id });
    } catch (error) {
      console.error('Failed to delete task:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete task' });
      throw error;
    }
  };

  const completeTask = async (id: string) => {
    return editTask(id, { status: 'done' });
  };

  const startTask = (taskId: string, projectId?: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      // Update task status to in-progress if it's not already
      if (task.status === 'todo') {
        editTask(taskId, { status: 'in-progress' });
      }
      
      // Trigger start-task event
      window.dispatchEvent(new CustomEvent('start-task', {
        detail: { taskId, projectId: projectId || task.projectId }
      }));
    }
  };

  // Computed values
  const getTaskById = (id: string) => {
    return tasks.find(t => t._id === id);
  };

  const getTasksByProject = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId);
  };

  const getTasksByStatus = (status?: 'todo' | 'in-progress' | 'done') => {
    if (!status) return tasks;
    return tasks.filter(t => t.status === status);
  };

  const getTasksByPriority = (priority?: number) => {
    if (priority === undefined) return tasks;
    return tasks.filter(t => t.priority === priority);
  };

  const getRecentTasks = (limit = 5) => {
    return tasks
      .filter(t => t.status !== 'done')
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, limit);
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(t => 
      t.deadline && 
      new Date(t.deadline) < now && 
      t.status !== 'done'
    );
  };

  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const overdueTasks = getOverdueTasks().length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      completionRate,
    };
  };

  const getTasksGroupedByStatus = () => {
    return {
      todo: tasks.filter(t => t.status === 'todo'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      done: tasks.filter(t => t.status === 'done'),
    };
  };

  const searchTasks = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return tasks.filter(t => 
      t.title.toLowerCase().includes(lowercaseQuery) ||
      (t.description && t.description.toLowerCase().includes(lowercaseQuery)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
  };

  const filterTasks = (filters: {
    projectId?: string;
    status?: 'todo' | 'in-progress' | 'done';
    priority?: number;
    hasDeadline?: boolean;
    overdue?: boolean;
  }) => {
    return tasks.filter(task => {
      if (filters.projectId && task.projectId !== filters.projectId) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority !== undefined && task.priority !== filters.priority) return false;
      if (filters.hasDeadline !== undefined) {
        const hasDeadline = !!task.deadline;
        if (hasDeadline !== filters.hasDeadline) return false;
      }
      if (filters.overdue) {
        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
        if (!isOverdue) return false;
      }
      return true;
    });
  };

  return {
    // State
    tasks,
    isLoading,
    error,
    
    // Actions
    addTask,
    editTask,
    removeTask,
    completeTask,
    startTask,
    refreshData,
    
    // Computed values
    getTaskById,
    getTasksByProject,
    getTasksByStatus,
    getTasksByPriority,
    getRecentTasks,
    getOverdueTasks,
    getTaskStats,
    getTasksGroupedByStatus,
    getTaskProgress,
    
    // Utility functions
    searchTasks,
    filterTasks,
  };
};