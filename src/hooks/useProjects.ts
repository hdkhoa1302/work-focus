import { useAppStore } from '../store/AppContext';
import { createProject, updateProject, deleteProject } from '../services/api';

export const useProjects = () => {
  const { state, dispatch, getProjectTasks, refreshData } = useAppStore();
  
  const { projects, isLoading, error } = state;

  // Actions
  const addProject = async (name: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newProject = await createProject(name);
      dispatch({ type: 'ADD_PROJECT', payload: newProject });
      return newProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create project' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const editProject = async (id: string, updates: { name?: string; status?: string; completed?: boolean }) => {
    try {
      const updatedProject = await updateProject(id, updates);
      dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates: updatedProject } });
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update project' });
      throw error;
    }
  };

  const removeProject = async (id: string) => {
    try {
      await deleteProject(id);
      dispatch({ type: 'DELETE_PROJECT', payload: id });
    } catch (error) {
      console.error('Failed to delete project:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete project' });
      throw error;
    }
  };

  const completeProject = async (id: string) => {
    return editProject(id, { completed: true, status: 'done' });
  };

  // Computed values
  const getProjectById = (id: string) => {
    return projects.find(p => p._id === id);
  };

  const getActiveProjects = () => {
    return projects.filter(p => !p.completed);
  };

  const getCompletedProjects = () => {
    return projects.filter(p => p.completed);
  };

  const getProjectStats = (projectId: string) => {
    const tasks = getProjectTasks(projectId);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate,
      canComplete: totalTasks > 0 && completedTasks === totalTasks,
    };
  };

  const getProjectsByStatus = () => {
    return {
      todo: projects.filter(p => !p.status || p.status === 'todo'),
      'in-progress': projects.filter(p => p.status === 'in-progress'),
      done: projects.filter(p => p.status === 'done' || p.completed),
    };
  };

  return {
    // State
    projects,
    isLoading,
    error,
    
    // Actions
    addProject,
    editProject,
    removeProject,
    completeProject,
    refreshData,
    
    // Computed values
    getProjectById,
    getActiveProjects,
    getCompletedProjects,
    getProjectStats,
    getProjectsByStatus,
    getProjectTasks,
  };
};