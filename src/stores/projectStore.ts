import { create } from 'zustand';
import { getProjects, createProject, updateProject, deleteProject, Project } from '../services/api';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setSelectedProject: (id: string | null) => void;
  
  // Computed
  getProjectById: (id: string) => Project | undefined;
  getActiveProjects: () => Project[];
  getCompletedProjects: () => Project[];
}

const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: localStorage.getItem('selectedProjectId'),
  isLoading: false,
  error: null,
  
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await getProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch projects', 
        isLoading: false 
      });
    }
  },
  
  createProject: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await createProject({ name });
      set(state => ({ 
        projects: [project, ...state.projects],
        isLoading: false
      }));
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create project', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateProject: async (id: string, data: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProject = await updateProject(id, data);
      set(state => ({
        projects: state.projects.map(p => p._id === id ? updatedProject : p),
        isLoading: false
      }));
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update project', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteProject(id);
      set(state => ({
        projects: state.projects.filter(p => p._id !== id),
        selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to delete project:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete project', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  setSelectedProject: (id: string | null) => {
    set({ selectedProjectId: id });
    if (id) {
      localStorage.setItem('selectedProjectId', id);
    } else {
      localStorage.removeItem('selectedProjectId');
    }
  },
  
  // Computed values
  getProjectById: (id: string) => {
    return get().projects.find(p => p._id === id);
  },
  
  getActiveProjects: () => {
    return get().projects.filter(p => !p.completed);
  },
  
  getCompletedProjects: () => {
    return get().projects.filter(p => p.completed);
  }
}));

export default useProjectStore;