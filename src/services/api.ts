import axios from 'axios';

const API_BASE = 'http://localhost:3000';
const api = axios.create({ baseURL: API_BASE });

// Thêm interceptor để gắn JWT token vào Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Task {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  tags?: string[];
  deadline?: string;
  priority?: number;
  status?: 'todo' | 'in-progress' | 'done';
  createdAt?: string;
  updatedAt?: string;
  estimatedPomodoros?: number;
}

export interface Session {
  _id: string;
  taskId?: string;
  type: 'focus' | 'break';
  startTime: string;
  endTime?: string;
  duration?: number;
}

export const getTasks = async (projectId?: string): Promise<Task[]> => {
  const resp = await api.get<Task[]>('/api/tasks', { params: projectId ? { projectId } : {} });
  return resp.data;
};

export const getSessions = async (): Promise<Session[]> => {
  const resp = await api.get<Session[]>('/api/sessions');
  return resp.data;
};

export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const resp = await api.post<Task>('/api/tasks', task);
  return resp.data;
};

export const updateTask = async (id: string, task: Partial<Task>): Promise<Task> => {
  const resp = await api.put<Task>(`/api/tasks/${id}`, task);
  return resp.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/api/tasks/${id}`);
};

// Xuất api instance để sử dụng trong các service khác
export { api };

// Thêm interface và API cho config
export interface Config {
  pomodoro: { focus: number; break: number };
  blockList: { hosts: string[]; apps: string[] };
  notifications: { enabled: boolean; sound: boolean };
}

export const getConfig = async (): Promise<Config> => {
  const resp = await api.get<Config>('/api/config');
  return resp.data;
};

export const saveConfig = async (config: Config): Promise<Config> => {
  const resp = await api.post<Config>('/api/config', config);
  return resp.data;
};

// Thêm Project interface và APIs
export interface Project {
  _id: string;
  name: string;
  createdAt?: string;
  completed?: boolean;
  status?: 'todo' | 'in-progress' | 'done';
}

export const getProjects = async (): Promise<Project[]> => {
  const resp = await api.get<Project[]>('/api/projects');
  return resp.data;
};

export const createProject = async (name: string): Promise<Project> => {
  const resp = await api.post<Project>('/api/projects', { name });
  return resp.data;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
  const resp = await api.put<Project>(`/api/projects/${id}`, data);
  return resp.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/api/projects/${id}`);
};

// Interfaces và API cho AI chat
export interface AIChatRequest {
  model: string;
  contents: string;
  generationConfig?: {
    temperature?: number;
    candidateCount?: number;
    topP?: number;
    topK?: number;
  };
}
export interface AIChatResponse {
  text: string;
}
export const postAIChat = async (payload: AIChatRequest): Promise<AIChatResponse> => {
  const resp = await api.post<AIChatResponse>('/api/ai/chat', payload);
  return resp.data;
};

export interface PrioritizedTask extends Task {
  priorityScore: number;
}

export interface SuggestResponse {
  tasks: PrioritizedTask[];
}

export const getSuggestions = async (): Promise<SuggestResponse> => {
  const resp = await api.post<SuggestResponse>('/api/ai/suggest');
  return resp.data;
};

// AI Analysis APIs
export interface AnalysisResponse {
  stats: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    activeProjects: number;
    completedProjects: number;
    totalFocusTime: number;
    totalSessions: number;
  };
  analysis: string;
  recommendations: string[];
}

export const getAnalysis = async (): Promise<AnalysisResponse> => {
  const resp = await api.post<AnalysisResponse>('/api/ai/analyze');
  return resp.data;
};

export interface EncouragementResponse {
  message: string;
  achievement?: string;
}

export const getEncouragement = async (taskId: string): Promise<EncouragementResponse> => {
  const resp = await api.post<EncouragementResponse>('/api/ai/encourage', { taskId });
  return resp.data;
};