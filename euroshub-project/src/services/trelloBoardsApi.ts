const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Types
export interface User {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
}
export interface Board {
  _id: string;
  name: string;
  description?: string;
  background: string;
  visibility: 'private' | 'team' | 'public';
  members?: Array<{
    userId?: {
      _id: string;
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  }>;
  createdBy?: {
    _id: string;
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  position: number;
  isArchived: boolean;
  isStarred: boolean;
  listsCount: number;
  cardsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface List {
  _id: string;
  boardId: string;
  name: string;
  position: number;
  color?: string;
  isArchived?: boolean;
  settings: {
    wipLimit?: {
      enabled: boolean;
      limit: number;
    };
    autoMove?: {
      enabled: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions: any[];
    };
    cardLimit?: number;
  };
  cardsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  _id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
  coverImage?: string;
  color?: string;
  members: Array<{
    userId: {
      _id: string;
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: string;
  }>;
  labels: string[];
  dueDate?: Date;
  createdAt: Date;
}

// Get auth token from localStorage or cookies (same as useAuth)
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  // Check cookie first (same as useAuth)
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  let token = getCookie('token');

  // Fallback to localStorage with correct key
  if (!token) {
    token = localStorage.getItem('token');
  }

  return token;
};

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = options.body instanceof FormData;

  const config: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Board API calls
export const boardsApi = {
  // Get all boards
  getBoards: async (): Promise<Board[]> => {
    const response = await apiCall('/trello-boards');
    return response.data;
  },

  // Upload background image
  uploadBackgroundImage: async (file: File): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiCall('/trello-boards/upload-background', {
      method: 'POST',
      body: formData,
    });
    return response.data;
  },

  // Create board
  createBoard: async (boardData: {
    name: string;
    description?: string;
    background?: string;
    visibility?: 'private' | 'team' | 'public';
    createDefaultLists?: boolean;
  }): Promise<Board> => {
    const response = await apiCall('/trello-boards', {
      method: 'POST',
      body: JSON.stringify(boardData),
    });
    return response.data;
  },

  // Get board details
  getBoard: async (boardId: string): Promise<Board & { lists: (List & { cards: Card[] })[] }> => {
    const response = await apiCall(`/trello-boards/${boardId}`);
    return response.data;
  },

  // Update board
  updateBoard: async (boardId: string, boardData: {
    name?: string;
    description?: string;
    background?: string;
    visibility?: 'private' | 'team' | 'public';
  }): Promise<Board> => {
    const response = await apiCall(`/trello-boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(boardData),
    });
    return response.data;
  },

  // Delete board
  deleteBoard: async (boardId: string): Promise<void> => {
    await apiCall(`/trello-boards/${boardId}`, {
      method: 'DELETE',
    });
  },

  // Archive board
  archiveBoard: async (boardId: string): Promise<{ isArchived: boolean }> => {
    const response = await apiCall(`/trello-boards/${boardId}/archive`, {
      method: 'PUT',
    });
    return response.data;
  },

  // Toggle star
  toggleStar: async (boardId: string): Promise<{ isStarred: boolean }> => {
    const response = await apiCall(`/trello-boards/${boardId}/star`, {
      method: 'POST',
    });
    return response.data;
  },

  // Add member
  addMember: async (boardId: string, userId: string, role: 'owner' | 'admin' | 'editor' | 'viewer' = 'viewer'): Promise<void> => {
    await apiCall(`/trello-boards/${boardId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  // Update member role
  updateMemberRole: async (boardId: string, userId: string, role: 'owner' | 'admin' | 'editor' | 'viewer'): Promise<void> => {
    await apiCall(`/trello-boards/${boardId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Remove member
  removeMember: async (boardId: string, userId: string): Promise<void> => {
    await apiCall(`/trello-boards/${boardId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Upload background image
  uploadBackground: async (imageFile: File): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await apiCall('/trello-boards/upload-background', {
      method: 'POST',
      body: formData,
    });

    return response.data;
  },
};

// List API calls
export const listsApi = {
  // Get lists for board
  getLists: async (boardId: string): Promise<List[]> => {
    const response = await apiCall(`/trello-lists/${boardId}/lists`);
    return response.data;
  },

  // Create list
  createList: async (boardId: string, listData: {
    name: string;
    description?: string;
    color?: string;
    position?: number;
  }): Promise<List> => {
    const response = await apiCall(`/trello-lists/${boardId}/lists`, {
      method: 'POST',
      body: JSON.stringify(listData),
    });
    return response.data;
  },

  // Update list
  updateList: async (listId: string, listData: {
    name?: string;
    description?: string;
    color?: string;
    settings?: {
      wipLimit?: {
        enabled: boolean;
        limit: number;
      };
      autoMove?: {
        enabled: boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions: any[];
      };
      cardLimit?: number;
    };
  }): Promise<List> => {
    const response = await apiCall(`/trello-lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(listData),
    });
    return response.data;
  },

  // Delete list
  deleteList: async (listId: string): Promise<void> => {
    await apiCall(`/trello-lists/${listId}`, {
      method: 'DELETE',
    });
  },

  // Archive/Unarchive list
  archiveList: async (listId: string): Promise<{ isArchived: boolean }> => {
    const response = await apiCall(`/trello-lists/${listId}/archive`, {
      method: 'PUT',
    });
    return response.data;
  },

  // Reorder list
  reorderList: async (listId: string, position: number, listOrder?: Array<{ listId: string }>): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { position };
    if (listOrder) {
      body.listOrder = listOrder;
    }

    await apiCall(`/trello-lists/${listId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // Move all cards to another list
  moveAllCards: async (listId: string, targetListId: string): Promise<{ movedCardsCount: number }> => {
    const response = await apiCall(`/trello-lists/${listId}/move-cards`, {
      method: 'POST',
      body: JSON.stringify({ targetListId }),
    });
    return response.data;
  },
};

// Card API calls
export const cardsApi = {
  // Get cards for list
  getCards: async (listId: string): Promise<Card[]> => {
    const response = await apiCall(`/trello-cards/${listId}/cards`);
    return response.data;
  },

  // Create card
  createCard: async (listId: string, cardData: {
    title: string;
    description?: string;
    coverImage?: string;
    color?: string;
    labels?: string[];
    dueDate?: Date;
    position?: number;
  }): Promise<Card> => {
    const response = await apiCall(`/trello-cards/${listId}/cards`, {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
    return response.data;
  },

  // Get card details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCard: async (cardId: string): Promise<Card & { activities: any[] }> => {
    const response = await apiCall(`/trello-cards/${cardId}`);
    return response.data;
  },

  // Update card
  updateCard: async (cardId: string, cardData: {
    title?: string;
    description?: string;
    coverImage?: string;
    color?: string;
    labels?: string[];
    dueDate?: Date;
    startDate?: Date;
    budget?: number;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'planning' | 'open' | 'in_progress' | 'review' | 'blocked' | 'completed' | 'on_hold';
    progress?: number;
    estimatedHours?: number;
    actualHours?: number;
  }): Promise<Card> => {
    const response = await apiCall(`/trello-cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(cardData),
    });
    return response.data;
  },

  // Delete card
  deleteCard: async (cardId: string): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}`, {
      method: 'DELETE',
    });
  },

  // Move card to different list
  moveCard: async (cardId: string, targetListId: string, position?: number): Promise<void> => {
    console.log('API call: moveCard', { cardId, targetListId, position });
    try {
      await apiCall(`/trello-cards/${cardId}/move`, {
        method: 'POST',
        body: JSON.stringify({ targetListId, position }),
      });
    } catch (error) {
      console.error('moveCard API error:', error);
      throw error;
    }
  },

  // Reorder card within list
  reorderCard: async (cardId: string, position: number): Promise<void> => {
    console.log('API call: reorderCard', { cardId, position });
    try {
      await apiCall(`/trello-cards/${cardId}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ position }),
      });
    } catch (error) {
      console.error('reorderCard API error:', error);
      throw error;
    }
  },

  // Add member to card
  addMember: async (cardId: string, userId: string, role: string = 'contributor'): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  // Remove member from card
  removeMember: async (cardId: string, userId: string): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Update member role
  updateMemberRole: async (cardId: string, userId: string, role: string): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Archive/Unarchive card
  archiveCard: async (cardId: string): Promise<{ isArchived: boolean }> => {
    const response = await apiCall(`/trello-cards/${cardId}/archive`, {
      method: 'PUT',
    });
    return response.data;
  },

  // Task management APIs
  addTask: async (cardId: string, taskData: {
    title: string;
    description?: string;
    assignedTo?: string | string[];
    priority?: 'low' | 'medium' | 'high';
    dependsOn?: string;
    autoAssignOnUnlock?: boolean;
    assignToOnUnlock?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> => {
    const response = await apiCall(`/trello-cards/${cardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.data;
  },

  updateTask: async (cardId: string, taskId: string, taskData: {
    title?: string;
    description?: string;
    completed?: boolean;
    assignedTo?: string | string[];
    priority?: 'low' | 'medium' | 'high';
    dueDate?: Date | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<any> => {
    const response = await apiCall(`/trello-cards/${cardId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
    return response.data;
  },

  deleteTask: async (cardId: string, taskId: string): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  reorderTask: async (cardId: string, taskId: string, newPosition: number): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/tasks/${taskId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ newPosition }),
    });
  },

  // Upload cover image for card
  uploadCoverImage: async (imageFile: File): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await apiCall('/trello-cards/upload-cover', {
      method: 'POST',
      body: formData,
    });

    return response.data;
  },

  // Subtask management
  addSubtask: async (cardId: string, taskId: string, subtaskData: { title: string }) => {
    const response = await apiCall(`/trello-cards/${cardId}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(subtaskData),
    });
    return response.data;
  },

  updateSubtask: async (cardId: string, taskId: string, subtaskId: string, updates: { title?: string; completed?: boolean }) => {
    const response = await apiCall(`/trello-cards/${cardId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  },

  deleteSubtask: async (cardId: string, taskId: string, subtaskId: string) => {
    await apiCall(`/trello-cards/${cardId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  },
};

// Users API calls
export const usersApi = {
  // Get all registered users
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiCall('/users');
    return response.data;
  },

  // Search users by name or email
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};