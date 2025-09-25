const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Types
export interface Board {
  _id: string;
  name: string;
  description?: string;
  background: string;
  visibility: 'private' | 'team' | 'public';
  members: Array<{
    userId: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  }>;
  createdBy: {
    _id: string;
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
  settings: {
    wipLimit?: number;
    autoArchive: boolean;
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
  members: Array<{
    userId: {
      _id: string;
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

// Get auth token from localStorage or cookies
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || null;
};

// API helper function
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

  // Toggle star
  toggleStar: async (boardId: string): Promise<{ isStarred: boolean }> => {
    const response = await apiCall(`/trello-boards/${boardId}/star`, {
      method: 'POST',
    });
    return response.data;
  },

  // Add member
  addMember: async (boardId: string, userId: string, role: 'member' | 'viewer' = 'member'): Promise<void> => {
    await apiCall(`/trello-boards/${boardId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  // Remove member
  removeMember: async (boardId: string, userId: string): Promise<void> => {
    await apiCall(`/trello-boards/${boardId}/members/${userId}`, {
      method: 'DELETE',
    });
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
  reorderList: async (listId: string, position: number): Promise<void> => {
    await apiCall(`/trello-lists/${listId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ position }),
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
  getCard: async (cardId: string): Promise<Card & { activities: any[] }> => {
    const response = await apiCall(`/trello-cards/${cardId}`);
    return response.data;
  },

  // Update card
  updateCard: async (cardId: string, cardData: {
    title?: string;
    description?: string;
    coverImage?: string;
    labels?: string[];
    dueDate?: Date;
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
    await apiCall(`/trello-cards/${cardId}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetListId, position }),
    });
  },

  // Reorder card within list
  reorderCard: async (cardId: string, position: number): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ position }),
    });
  },

  // Add member to card
  addMember: async (cardId: string, userId: string): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Remove member from card
  removeMember: async (cardId: string, userId: string): Promise<void> => {
    await apiCall(`/trello-cards/${cardId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Archive/Unarchive card
  archiveCard: async (cardId: string): Promise<{ isArchived: boolean }> => {
    const response = await apiCall(`/trello-cards/${cardId}/archive`, {
      method: 'PUT',
    });
    return response.data;
  },
};