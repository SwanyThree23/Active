import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Types
export interface Stream {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'offline' | 'live' | 'ended';
  streamKey: string;
  rtmpUrl?: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  tags: string[];
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  viewerCount?: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface ChatMessage {
  id: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export interface StreamAnalytics {
  id: string;
  streamId: string;
  timestamp: string;
  viewers: number;
  peakViewers: number;
  chatMessages: number;
  engagementScore: number;
  sentiment: number;
}

export interface Notebook {
  id: string;
  title: string;
  description?: string;
  sources: Array<{
    type: 'text' | 'url' | 'file' | 'stream';
    content: string;
    title?: string;
  }>;
  synthesis?: string;
  summary?: string;
  keyInsights: string[];
  createdAt: string;
  podcasts?: Podcast[];
}

export interface Podcast {
  id: string;
  title?: string;
  audioUrl?: string;
  script?: string;
  duration?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

export interface Task {
  id: string;
  agentType: string;
  taskType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

// API Functions
export const streamApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) =>
    api.get<{ streams: Stream[]; total: number }>('/streams', { params }),

  get: (id: string) =>
    api.get<{ stream: Stream }>(`/streams/${id}`),

  create: (data: { title: string; description?: string; category?: string; tags?: string[] }) =>
    api.post<{ stream: Stream }>('/streams/create', data),

  update: (id: string, data: Partial<Stream>) =>
    api.put<{ stream: Stream }>(`/streams/${id}`, data),

  start: (id: string) =>
    api.post<{ stream: Stream }>(`/streams/${id}/start`),

  end: (id: string) =>
    api.post<{ stream: Stream }>(`/streams/${id}/end`),

  delete: (id: string) =>
    api.delete(`/streams/${id}`),
};

export const chatApi = {
  getMessages: (streamId: string, params?: { limit?: number; before?: string }) =>
    api.get<{ messages: ChatMessage[] }>(`/chat/stream/${streamId}`, { params }),

  sendMessage: (streamId: string, message: string) =>
    api.post<{ chatMessage: ChatMessage }>(`/chat/stream/${streamId}`, { message }),

  deleteMessage: (messageId: string) =>
    api.delete(`/chat/${messageId}`),
};

export const analyticsApi = {
  getStreamAnalytics: (streamId: string, params?: { period?: string; limit?: number }) =>
    api.get<{ analytics: StreamAnalytics[]; currentViewers: number }>(`/analytics/stream/${streamId}`, { params }),

  getStreamSummary: (streamId: string) =>
    api.get<{ summary: Record<string, unknown> }>(`/analytics/stream/${streamId}/summary`),

  getRealtime: (streamId: string) =>
    api.get<{ realtime: Record<string, unknown> }>(`/analytics/stream/${streamId}/realtime`),

  getUserAnalytics: () =>
    api.get<{ overview: Record<string, unknown>; recentStreams: Stream[] }>('/analytics/user'),
};

export const agentsApi = {
  createTask: (data: { agentType: string; taskType: string; streamId?: string; input?: Record<string, unknown> }) =>
    api.post<{ task: Task }>('/agents/task', data),

  getTasks: (params?: { status?: string; agentType?: string }) =>
    api.get<{ tasks: Task[] }>('/agents/tasks', { params }),

  getTask: (taskId: string) =>
    api.get<{ task: Task }>(`/agents/task/${taskId}`),

  getAgentTypes: () =>
    api.get<{ agentTypes: Array<{ id: string; name: string; description: string }> }>('/agents/types'),
};

export const notebookApi = {
  create: (data: { title: string; description?: string; sources: Array<{ type: string; content: string; title?: string }> }) =>
    api.post<{ notebook: Notebook }>('/notebooklm/notebook/create', data),

  list: (params?: { limit?: number; offset?: number }) =>
    api.get<{ notebooks: Notebook[] }>('/notebooklm/notebooks', { params }),

  get: (id: string) =>
    api.get<{ notebook: Notebook }>(`/notebooklm/notebook/${id}`),

  update: (id: string, data: { title?: string; description?: string }) =>
    api.put<{ notebook: Notebook }>(`/notebooklm/notebook/${id}`, data),

  delete: (id: string) =>
    api.delete(`/notebooklm/notebook/${id}`),

  generatePodcast: (id: string, data?: { title?: string; duration?: 'short' | 'medium' | 'long' }) =>
    api.post<{ podcast: Podcast }>(`/notebooklm/notebook/${id}/podcast`, data),

  chat: (id: string, message: string) =>
    api.post<{ response: string; sources: string[] }>(`/notebooklm/notebook/${id}/chat`, { message }),

  addSource: (id: string, source: { type: string; content: string; title?: string }) =>
    api.post<{ notebook: Notebook }>(`/notebooklm/notebook/${id}/add-source`, source),

  getPodcast: (id: string) =>
    api.get<{ podcast: Podcast }>(`/notebooklm/podcast/${id}`),
};

export const n8nApi = {
  listWorkflows: () =>
    api.get<{ workflows: Array<{ id: string; name: string; active: boolean }> }>('/n8n/workflows'),

  executeWorkflow: (workflowId: string, data?: { input?: Record<string, unknown>; streamId?: string }) =>
    api.post(`/n8n/execute/${workflowId}`, data),

  getExecutions: (params?: { workflowId?: string; status?: string }) =>
    api.get('/n8n/executions', { params }),
};

export default api;
