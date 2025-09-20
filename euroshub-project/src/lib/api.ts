import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ApiError extends Error {
  status: number;
  response?: any;

  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

export async function apiCall<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { requireAuth = true, ...fetchOptions } = options;

  // Get auth token
  const token = Cookies.get('token');

  // Set default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  // Add auth header if required and token exists
  if (requireAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP error! status: ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error or other fetch error
    throw new ApiError(
      'Network error occurred. Please check your connection.',
      0,
      null
    );
  }
}

// Helper functions for common HTTP methods
export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiCall<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiCall<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Project Management API functions
export const projectsApi = {
  // Projects
  getProjects: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/projects${query}`);
  },

  getProject: (id: string) => api.get(`/api/projects/${id}`),

  createProject: (data: any) => api.post('/api/projects', data),

  updateProject: (id: string, data: any) => api.put(`/api/projects/${id}`, data),

  deleteProject: (id: string) => api.delete(`/api/projects/${id}`),

  // Project Members
  addMember: (projectId: string, data: { userId: string; role: string }) =>
    api.post(`/api/projects/${projectId}/members`, data),

  updateMemberRole: (projectId: string, memberId: string, data: { role: string }) =>
    api.put(`/api/projects/${projectId}/members/${memberId}`, data),

  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/api/projects/${projectId}/members/${memberId}`),

  getProjectActivities: (projectId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/projects/${projectId}/activities${query}`);
  },

  // Boards
  getProjectBoards: (projectId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/projects/${projectId}/boards${query}`);
  },

  createBoard: (projectId: string, data: any) =>
    api.post(`/api/projects/${projectId}/boards`, data),

  getBoard: (boardId: string) => api.get(`/api/boards/${boardId}`),

  updateBoard: (boardId: string, data: any) => api.put(`/api/boards/${boardId}`, data),

  deleteBoard: (boardId: string) => api.delete(`/api/boards/${boardId}`),

  duplicateBoard: (boardId: string, data: { title: string; includeCards?: boolean }) =>
    api.post(`/api/boards/${boardId}/duplicate`, data),

  // Lists
  getBoardLists: (boardId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/boards/${boardId}/lists${query}`);
  },

  createList: (boardId: string, data: any) =>
    api.post(`/api/boards/${boardId}/lists`, data),

  updateList: (listId: string, data: any) => api.put(`/api/lists/${listId}`, data),

  deleteList: (listId: string) => api.delete(`/api/lists/${listId}`),

  moveAllCards: (listId: string, data: { targetListId: string }) =>
    api.post(`/api/lists/${listId}/move-all-cards`, data),

  // Cards
  getListCards: (listId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/lists/${listId}/cards${query}`);
  },

  createCard: (listId: string, data: any) =>
    api.post(`/api/lists/${listId}/cards`, data),

  getCard: (cardId: string) => api.get(`/api/cards/${cardId}`),

  updateCard: (cardId: string, data: any) => api.put(`/api/cards/${cardId}`, data),

  deleteCard: (cardId: string) => api.delete(`/api/cards/${cardId}`),

  moveCard: (cardId: string, data: { targetListId: string; position?: number }) =>
    api.put(`/api/cards/${cardId}/move`, data),

  assignUsers: (cardId: string, data: { userIds: string[] }) =>
    api.put(`/api/cards/${cardId}/assign`, data),

  unassignUsers: (cardId: string, data: { userIds: string[] }) =>
    api.put(`/api/cards/${cardId}/unassign`, data),

  addComment: (cardId: string, data: { text: string; mentions?: string[] }) =>
    api.post(`/api/cards/${cardId}/comments`, data),

  updateComment: (cardId: string, commentId: string, data: { text: string }) =>
    api.put(`/api/cards/${cardId}/comments/${commentId}`, data),

  addTimeEntry: (cardId: string, data: { hours: number; description?: string }) =>
    api.post(`/api/cards/${cardId}/time`, data),

  getMyAssignedCards: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/cards/assigned-to-me${query}`);
  },

  // Activities
  getDashboardActivities: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/activities/dashboard${query}`);
  },

  getMyActivities: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/activities/my-activities${query}`);
  },

  getActivityTypes: () => api.get('/api/activities/types'),

  getActivityStats: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/activities/stats${query}`);
  },
};

// User management API functions
export const usersApi = {
  getUsers: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/api/users${query}`);
  },

  getUser: (id: string) => api.get(`/api/users/${id}`),

  createUser: (data: any) => api.post('/api/users', data),

  updateUser: (id: string, data: any) => api.put(`/api/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/api/users/${id}`),

  getCurrentUser: () => api.get('/api/auth/me'),
};

export default api;