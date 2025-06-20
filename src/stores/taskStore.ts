import { create } from 'zustand';
import { getTasks, createTask, updateTask, deleteTask, Task } from '../services/api';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTasks: (projectId?: string) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  
  // Computed
  getTaskById: (id: string) => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByStatus: (status: 'todo' | 'in-progress' | 'done') => Task[];
  getPendingTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async (projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await getTasks(projectId);
      set({ tasks, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch tasks', 
        isLoading: false 
      });
    }
  },
  
  createTask: async (taskData: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const task = await createTask(taskData);
      set(state => ({ 
        tasks: [task, ...state.tasks],
        isLoading: false
      }));
      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create task', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateTask: async (id: string, taskData: Partial<Task>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTask = await updateTask(id, taskData);
      set(state => ({
        tasks: state.tasks.map(t => t._id === id ? updatedTask : t),
        isLoading: false
      }));
      
      // Trigger task-completed event if status changed to done
      if (taskData.status === 'done') {
        const task = get().tasks.find(t => t._id === id);
        if (task) {
          window.dispatchEvent(new CustomEvent('task-completed', {
            detail: { taskId: id, taskTitle: task.title }
          }));
        }
      }
      
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update task', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteTask: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteTask(id);
      set(state => ({
        tasks: state.tasks.filter(t => t._id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to delete task:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete task', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Computed values
  getTaskById: (id: string) => {
    return get().tasks.find(t => t._id === id);
  },
  
  getTasksByProject: (projectId: string) => {
    return get().tasks.filter(t => t.projectId === projectId);
  },
  
  getTasksByStatus: (status: 'todo' | 'in-progress' | 'done') => {
    return get().tasks.filter(t => t.status === status);
  },
  
  getPendingTasks: () => {
    return get().tasks.filter(t => t.status !== 'done');
  },
  
  getCompletedTasks: () => {
    return get().tasks.filter(t => t.status === 'done');
  }
}));

export default useTaskStore;