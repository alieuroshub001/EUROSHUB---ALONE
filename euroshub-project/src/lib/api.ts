import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

interface ApiResponse<T = unknown> {
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
  response?: unknown;

  constructor(message: string, status: number, response?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

export async function apiCall<T = unknown>(
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
  get: <T = unknown>(endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiCall<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = unknown>(endpoint: string, data?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(endpoint: string, data?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, data?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
    apiCall<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(endpoint: string, options?: Omit<ApiOptions, 'method'>) =>
    apiCall<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Type definitions for API requests
interface CreateProjectData {
  name: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

interface AddMemberData {
  userId: string;
  role: string;
}

interface UpdateMemberRoleData {
  role: string;
}

interface CreateBoardData {
  title: string;
  description?: string;
  [key: string]: unknown;
}

interface UpdateBoardData {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

interface DuplicateBoardData {
  title: string;
  includeCards?: boolean;
}

interface CreateListData {
  title: string;
  position?: number;
  [key: string]: unknown;
}

interface UpdateListData {
  title?: string;
  position?: number;
  [key: string]: unknown;
}

interface MoveAllCardsData {
  targetListId: string;
}

interface CreateCardData {
  title: string;
  description?: string;
  [key: string]: unknown;
}

interface UpdateCardData {
  title?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
}

interface MoveCardData {
  targetListId: string;
  position?: number;
}

interface AssignUsersData {
  userIds: string[];
}

interface AddCommentData {
  text: string;
  mentions?: string[];
}

interface UpdateCommentData {
  text: string;
}

interface AddTimeEntryData {
  hours: number;
  description?: string;
}

interface CreateUserData {
  email: string;
  name: string;
  password?: string;
  [key: string]: unknown;
}

interface UpdateUserData {
  email?: string;
  name?: string;
  [key: string]: unknown;
}

// Project Management API functions
export const projectsApi = {
  // Projects
  getProjects: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/projects${query}`);
  },

  getProject: (id: string) => api.get(`/projects/${id}`),

  createProject: (data: CreateProjectData) => api.post('/projects', data),

  updateProject: (id: string, data: UpdateProjectData) => api.put(`/projects/${id}`, data),

  deleteProject: (id: string) => api.delete(`/projects/${id}`),

  // Project Members
  addMember: (projectId: string, data: AddMemberData) =>
    api.post(`/projects/${projectId}/members`, data),

  updateMemberRole: (projectId: string, memberId: string, data: UpdateMemberRoleData) =>
    api.put(`/projects/${projectId}/members/${memberId}`, data),

  removeMember: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`),

  getProjectActivities: (projectId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/projects/${projectId}/activities${query}`);
  },

  // Boards
  getProjectBoards: (projectId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/projects/${projectId}/boards${query}`);
  },

  createBoard: (projectId: string, data: CreateBoardData) =>
    api.post(`/projects/${projectId}/boards`, data),

  getBoard: (boardId: string) => api.get(`/boards/${boardId}`),

  updateBoard: (boardId: string, data: UpdateBoardData) => api.put(`/boards/${boardId}`, data),

  deleteBoard: (boardId: string) => api.delete(`/boards/${boardId}`),

  duplicateBoard: (boardId: string, data: DuplicateBoardData) =>
    api.post(`/boards/${boardId}/duplicate`, data),

  // Lists
  getBoardLists: (boardId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/boards/${boardId}/lists${query}`);
  },

  createList: (boardId: string, data: CreateListData) =>
    api.post(`/boards/${boardId}/lists`, data),

  updateList: (listId: string, data: UpdateListData) => api.put(`/lists/${listId}`, data),

  deleteList: (listId: string) => api.delete(`/lists/${listId}`),

  moveAllCards: (listId: string, data: MoveAllCardsData) =>
    api.post(`/lists/${listId}/move-all-cards`, data),

  // Cards
  getListCards: (listId: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/lists/${listId}/cards${query}`);
  },

  createCard: (listId: string, data: CreateCardData) =>
    api.post(`/lists/${listId}/cards`, data),

  getCard: (cardId: string) => api.get(`/cards/${cardId}`),

  updateCard: (cardId: string, data: UpdateCardData) => api.put(`/cards/${cardId}`, data),

  deleteCard: (cardId: string) => api.delete(`/cards/${cardId}`),

  moveCard: (cardId: string, data: MoveCardData) =>
    api.put(`/cards/${cardId}/move`, data),

  assignUsers: (cardId: string, data: AssignUsersData) =>
    api.put(`/cards/${cardId}/assign`, data),

  unassignUsers: (cardId: string, data: AssignUsersData) =>
    api.put(`/cards/${cardId}/unassign`, data),

  addComment: (cardId: string, data: AddCommentData) =>
    api.post(`/cards/${cardId}/comments`, data),

  updateComment: (cardId: string, commentId: string, data: UpdateCommentData) =>
    api.put(`/cards/${cardId}/comments/${commentId}`, data),

  addTimeEntry: (cardId: string, data: AddTimeEntryData) =>
    api.post(`/cards/${cardId}/time`, data),

  getMyAssignedCards: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/cards/assigned-to-me${query}`);
  },

  // Activities
  getDashboardActivities: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/activities/dashboard${query}`);
  },

  getMyActivities: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/activities/my-activities${query}`);
  },

  getActivityTypes: () => api.get('/activities/types'),

  getActivityStats: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/activities/stats${query}`);
  },
};

// User management API functions
export const usersApi = {
  getUsers: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return api.get(`/users${query}`);
  },

  getUser: (id: string) => api.get(`/users/${id}`),

  createUser: (data: CreateUserData) => api.post('/users', data),

  updateUser: (id: string, data: UpdateUserData) => api.put(`/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/users/${id}`),

  getCurrentUser: () => api.get('/auth/me'),
};

export default api;