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

export interface Message {
  from: 'user' | 'bot';
  text: string;
  timestamp: Date;
  type?: 'text' | 'project' | 'task' | 'analysis' | 'encouragement';
  data?: any;
}

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  messages: Message[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Conversation APIs
export const getConversations = async (): Promise<Conversation[]> => {
  const resp = await api.get<Conversation[]>('/api/conversations');
  return resp.data;
};

export const createConversation = async (title?: string): Promise<Conversation> => {
  const resp = await api.post<Conversation>('/api/conversations', { title });
  return resp.data;
};

export const getConversation = async (id: string): Promise<Conversation> => {
  const resp = await api.get<Conversation>(`/api/conversations/${id}`);
  return resp.data;
};

export const activateConversation = async (id: string): Promise<Conversation> => {
  const resp = await api.put<Conversation>(`/api/conversations/${id}/activate`);
  return resp.data;
};

export const deleteConversation = async (id: string): Promise<void> => {
  await api.delete(`/api/conversations/${id}`);
};

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
  message: string;
  conversationId?: string;
}

export interface AIChatResponse {
  message: string;
  type: string;
  data?: any;
  conversationId: string;
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