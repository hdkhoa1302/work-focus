import axios from 'axios';

// Dynamic API base URL
let API_BASE = 'http://localhost:3000';

// Initialize API config from main process
const initializeApiConfig = async () => {
  if (typeof window !== 'undefined' && window.ipc?.invoke) {
    try {
      const config = await window.ipc.invoke('get-api-config');
      if (config?.baseUrl) {
        API_BASE = config.baseUrl;
        api.defaults.baseURL = API_BASE;
        console.log(`✅ API client đã cập nhật baseURL: ${API_BASE}`);
      }
    } catch (error) {
      console.warn('⚠️ Không thể lấy cấu hình API từ main process, sử dụng port mặc định 3000');
    }
  }
};

// Initialize on module load
initializeApiConfig();

const api = axios.create({ baseURL: API_BASE });

// Thêm interceptor để gắn JWT token vào Authorization header
api.interceptors.request.use((config) => {
  // Check both localStorage and sessionStorage for token
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid, clear storage and redirect to login
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      // Optionally trigger a logout event or redirect
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

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
  relatedItems?: string[];
}

export interface Session {
  _id: string;
  taskId?: string;
  type: 'focus' | 'break';
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface WhiteboardItem {
  id: string;
  type: 'project' | 'task' | 'note' | 'decision';
  title: string;
  description: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: Date;
  relatedTo?: string;
  priority?: number;
  tags?: string[];
}

export interface Message {
  from: 'user' | 'bot';
  text: string;
  timestamp: Date;
  type?: 'text' | 'project' | 'task' | 'analysis' | 'encouragement' | 'note' | 'decision' | 'whiteboard' | 'whiteboard_update' | 'whiteboard_update_confirmation' | 'apply_whiteboard_update' | 'work_breakdown' | 'work_breakdown_created';
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

// Enhanced Config interface with work schedule
export interface Config {
  pomodoro: { focus: number; break: number };
  blockList: { hosts: string[]; apps: string[] };
  notifications: { enabled: boolean; sound: boolean };
  workSchedule: {
    hoursPerDay: number;
    daysPerWeek: number;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    breakHours: number;
    overtimeRate: number; // multiplier for overtime calculation
  };
}

export const getConfig = async (): Promise<Config> => {
  const resp = await api.get<Config>('/api/config');
  return resp.data;
};

export const saveConfig = async (config: Config): Promise<Config> => {
  const resp = await api.post<Config>('/api/config', config);
  return resp.data;
};

// Enhanced Project interface with deadline and time tracking
export interface Project {
  _id: string;
  name: string;
  createdAt?: string;
  completed?: boolean;
  status?: 'todo' | 'in-progress' | 'done';
  deadline?: string;
  estimatedHours?: number;
  actualHours?: number;
  description?: string;
  priority?: number;
}

export const getProjects = async (): Promise<Project[]> => {
  const resp = await api.get<Project[]>('/api/projects');
  return resp.data;
};

export const createProject = async (projectData: Partial<Project>): Promise<Project> => {
  const resp = await api.post<Project>('/api/projects', projectData);
  return resp.data;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
  const resp = await api.put<Project>(`/api/projects/${id}`, data);
  return resp.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/api/projects/${id}`);
};

// Project Progress Analysis API
export interface ProjectProgressAnalysis {
  project: Project;
  tasks: Task[];
  sessions: Session[];
  analysis: {
    totalEstimatedHours: number;
    totalActualHours: number;
    completionPercentage: number;
    remainingHours: number;
    isOnTrack: boolean;
    daysRemaining: number;
    requiredDailyHours: number;
    overtimeRequired: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
  workSchedule: Config['workSchedule'];
}

export const getProjectProgress = async (projectId: string): Promise<ProjectProgressAnalysis> => {
  const resp = await api.get<ProjectProgressAnalysis>(`/api/projects/${projectId}/progress`);
  return resp.data;
};

// Daily Tasks API
export interface DailyTasksResponse {
  date: string;
  tasksWithDeadline: Task[];
  tasksInProgress: Task[];
  projects: Project[];
  stats: {
    tasksWithDeadline: number;
    tasksInProgress: number;
    projectsWithDeadline: number;
    completedToday: number;
    focusSessions: number;
    totalFocusTime: number;
  };
}

export const getDailyTasks = async (date?: Date): Promise<DailyTasksResponse> => {
  const params = date ? { date: date.toISOString() } : {};
  const resp = await api.get<DailyTasksResponse>('/api/daily-tasks', { params });
  return resp.data;
};

// Enhanced interfaces và API cho AI chat với whiteboard context
export interface AIChatRequest {
  message: string;
  conversationId?: string;
  whiteboardContext?: WhiteboardItem[];
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
  achievements?: string[];
  stats?: {
    completedTasks: number;
    totalSessions: number;
    todayTasks: number;
    taskSessions: number;
  };
}

export const getEncouragement = async (taskId: string): Promise<EncouragementResponse> => {
  const resp = await api.post<EncouragementResponse>('/api/ai/encourage', { taskId });
  return resp.data;
};

// New Proactive Feedback API
export interface ProactiveFeedbackResponse {
  feedback: string;
  stats: {
    completionRate: number;
    todayPomodoros: number;
    activeProjects: number;
    totalFocusTime: number;
  };
  timestamp: Date;
}

export const getProactiveFeedback = async (): Promise<ProactiveFeedbackResponse> => {
  const resp = await api.post<ProactiveFeedbackResponse>('/api/ai/proactive-feedback');
  return resp.data;
};

// Whiteboard management APIs
export interface WhiteboardUpdateRequest {
  itemTitle: string;
  updates: Partial<WhiteboardItem>;
  reason?: string;
}

export const updateWhiteboardItem = async (itemTitle: string, updates: Partial<WhiteboardItem>): Promise<void> => {
  // This is handled locally in the frontend for now
  // Could be extended to sync with backend if needed
  const savedWhiteboard = localStorage.getItem('ai-whiteboard');
  if (savedWhiteboard) {
    const items: WhiteboardItem[] = JSON.parse(savedWhiteboard);
    const updatedItems = items.map(item => 
      item.title === itemTitle ? { ...item, ...updates } : item
    );
    localStorage.setItem('ai-whiteboard', JSON.stringify(updatedItems));
  }
};

// Time calculation utilities
export const calculateWorkingHours = (
  startDate: Date, 
  endDate: Date, 
  workSchedule: Config['workSchedule']
): number => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
  const workingDays = Math.floor(days * (workSchedule.daysPerWeek / 7));
  return workingDays * workSchedule.hoursPerDay;
};

export const calculateOvertimeRequired = (
  remainingHours: number,
  availableWorkingHours: number,
  workSchedule: Config['workSchedule']
): number => {
  if (remainingHours <= availableWorkingHours) return 0;
  return remainingHours - availableWorkingHours;
};

// Calculate daily workload
export const calculateDailyWorkload = (
  tasks: Task[],
  workSchedule: Config['workSchedule']
): {
  isOverloaded: boolean;
  availableMinutes: number;
  requiredMinutes: number;
  overloadedMinutes: number;
} => {
  // Tính toán thời gian làm việc có sẵn trong ngày
  const [startHour, startMinute] = workSchedule.startTime.split(':').map(Number);
  const [endHour, endMinute] = workSchedule.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Tính tổng thời gian làm việc trong ngày (trừ giờ nghỉ)
  const totalWorkMinutes = endMinutes - startMinutes - (workSchedule.breakHours * 60);
  
  // Tính tổng thời gian cần thiết cho các task
  let requiredMinutes = 0;
  
  tasks.forEach(task => {
    // Mỗi pomodoro là 25 phút
    requiredMinutes += (task.estimatedPomodoros || 1) * 25;
  });
  
  // Kiểm tra xem có đủ thời gian không
  const isOverloaded = requiredMinutes > totalWorkMinutes;
  const overloadedMinutes = Math.max(0, requiredMinutes - totalWorkMinutes);
  
  return {
    isOverloaded,
    availableMinutes: totalWorkMinutes,
    requiredMinutes,
    overloadedMinutes
  };
};