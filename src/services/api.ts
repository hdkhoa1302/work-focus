import axios from 'axios';

const API_BASE = 'http://localhost:3000';
const api = axios.create({ baseURL: API_BASE });

export interface Task {
  _id: string;
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

export const getTasks = async (): Promise<Task[]> => {
  const resp = await api.get<Task[]>('/api/tasks');
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