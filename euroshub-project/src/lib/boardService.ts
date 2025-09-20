import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Types
export interface Board {
  _id: string;
  title: string;
  description?: string;
  project: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
  isDefault: boolean;
  color: string;
  position: number;
  isArchived: boolean;
  settings: {
    allowComments: boolean;
    allowAttachments: boolean;
    autoArchive: boolean;
    cardLimit: number;
  };
  metadata: {
    totalLists: number;
    totalCards: number;
    completedCards: number;
  };
  lists?: List[];
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  _id: string;
  title: string;
  description?: string;
  board: string;
  project: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
  position: number;
  color: string;
  isDefault: boolean;
  listType: 'todo' | 'in_progress' | 'review' | 'done' | 'custom';
  isArchived: boolean;
  settings: {
    cardLimit: number;
    wipLimit: {
      enabled: boolean;
      limit: number;
    };
  };
  metadata: {
    cardCount: number;
    completedCards: number;
  };
  cards?: Card[];
  isWipLimitExceeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  _id: string;
  title: string;
  description?: string;
  list: string;
  board: string;
  project: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
  assignedTo: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  } | null>;
  watchers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null>;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'review' | 'blocked' | 'completed';
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  completedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  } | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
  checklist: Array<{
    text: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
  }>;
  attachments: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
    uploadedBy: string;
  }>;
  comments: Array<{
    _id: string;
    text: string;
    author: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    } | null;
    mentions: string[];
    isEdited: boolean;
    editedAt?: string;
    createdAt: string;
  }>;
  timeTracking?: {
    estimated: number;
    spent: number;
    remaining?: number;
    entries: Array<{
      user: {
        _id: string;
        firstName: string;
        lastName: string;
      } | null;
      hours: number;
      description?: string;
      date: string;
    }>;
  };
  customFields: Array<{
    name: string;
    value: any;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  }>;
  isArchived: boolean;
  isOverdue: boolean;
  checklistCompletion: number;
  totalTimeSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardRequest {
  title: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: {
    allowComments?: boolean;
    allowAttachments?: boolean;
    autoArchive?: boolean;
    cardLimit?: number;
  };
  createDefaultLists?: boolean;
}

export interface UpdateBoardRequest {
  title?: string;
  description?: string;
  color?: string;
  settings?: {
    allowComments?: boolean;
    allowAttachments?: boolean;
    autoArchive?: boolean;
    cardLimit?: number;
  };
}

export interface CreateListRequest {
  title: string;
  description?: string;
  color?: string;
  listType?: 'todo' | 'in_progress' | 'review' | 'done' | 'custom';
  position?: number;
  settings?: {
    cardLimit?: number;
    wipLimit?: {
      enabled: boolean;
      limit: number;
    };
  };
}

export interface UpdateListRequest {
  title?: string;
  description?: string;
  color?: string;
  settings?: {
    cardLimit?: number;
    wipLimit?: {
      enabled?: boolean;
      limit?: number;
    };
  };
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  assignedTo?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  startDate?: string;
  labels?: Array<{
    name: string;
    color: string;
  }>;
  position?: number;
  customFields?: Array<{
    name: string;
    value: any;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  }>;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'open' | 'in_progress' | 'review' | 'blocked' | 'completed';
  dueDate?: string;
  startDate?: string;
  labels?: Array<{
    name: string;
    color: string;
  }>;
  customFields?: Array<{
    name: string;
    value: any;
    type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  }>;
}

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const boardService = {
  // Boards
  async getProjectBoards(projectId: string, includeArchived: boolean = false): Promise<Board[]> {
    try {
      const params = new URLSearchParams();
      if (includeArchived) params.append('includeArchived', 'true');

      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/boards?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch boards');
    }
  },

  async getBoard(boardId: string): Promise<Board> {
    try {
      const response = await axios.get(`${API_BASE_URL}/boards/${boardId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch board');
    }
  },

  async createBoard(projectId: string, boardData: CreateBoardRequest): Promise<Board> {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/boards`, boardData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to create board');
    }
  },

  async updateBoard(boardId: string, boardData: UpdateBoardRequest): Promise<Board> {
    try {
      const response = await axios.put(`${API_BASE_URL}/boards/${boardId}`, boardData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update board');
    }
  },

  async deleteBoard(boardId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/boards/${boardId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete board');
    }
  },

  async duplicateBoard(boardId: string, title?: string, includeCards: boolean = false): Promise<Board> {
    try {
      const response = await axios.post(`${API_BASE_URL}/boards/${boardId}/duplicate`,
        { title, includeCards },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to duplicate board');
    }
  },

  // Lists
  async getBoardLists(boardId: string, includeCards: boolean = true): Promise<List[]> {
    try {
      const params = new URLSearchParams();
      if (!includeCards) params.append('includeCards', 'false');

      const response = await axios.get(`${API_BASE_URL}/boards/${boardId}/lists?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch lists');
    }
  },

  async createList(boardId: string, listData: CreateListRequest): Promise<List> {
    try {
      const response = await axios.post(`${API_BASE_URL}/boards/${boardId}/lists`, listData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to create list');
    }
  },

  async updateList(listId: string, listData: UpdateListRequest): Promise<List> {
    try {
      const response = await axios.put(`${API_BASE_URL}/lists/${listId}`, listData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update list');
    }
  },

  async deleteList(listId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/lists/${listId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete list');
    }
  },

  async moveAllCards(listId: string, targetListId: string): Promise<{ movedCount: number }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/lists/${listId}/move-all-cards`,
        { targetListId },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to move cards');
    }
  },

  // Cards
  async getListCards(listId: string, filters?: { assignedTo?: string; priority?: string; status?: string }): Promise<Card[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }

      const response = await axios.get(`${API_BASE_URL}/lists/${listId}/cards?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch cards');
    }
  },

  async getCard(cardId: string): Promise<Card> {
    try {
      const response = await axios.get(`${API_BASE_URL}/cards/${cardId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch card');
    }
  },

  async createCard(listId: string, cardData: CreateCardRequest): Promise<Card> {
    try {
      const response = await axios.post(`${API_BASE_URL}/lists/${listId}/cards`, cardData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to create card');
    }
  },

  async updateCard(cardId: string, cardData: UpdateCardRequest): Promise<Card> {
    try {
      const response = await axios.put(`${API_BASE_URL}/cards/${cardId}`, cardData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update card');
    }
  },

  async deleteCard(cardId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/cards/${cardId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete card');
    }
  },

  async moveCard(cardId: string, targetListId: string, position?: number): Promise<Card> {
    try {
      const response = await axios.put(`${API_BASE_URL}/cards/${cardId}/move`,
        { targetListId, position },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to move card');
    }
  },

  async assignUsers(cardId: string, userIds: string[]): Promise<Card['assignedTo']> {
    try {
      const response = await axios.put(`${API_BASE_URL}/cards/${cardId}/assign`,
        { userIds },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to assign users');
    }
  },

  async unassignUsers(cardId: string, userIds: string[]): Promise<Card['assignedTo']> {
    try {
      const response = await axios.put(`${API_BASE_URL}/cards/${cardId}/unassign`,
        { userIds },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to unassign users');
    }
  },

  async addComment(cardId: string, text: string, mentions: string[] = []): Promise<Card['comments'][0]> {
    try {
      const response = await axios.post(`${API_BASE_URL}/cards/${cardId}/comments`,
        { text, mentions },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to add comment');
    }
  },

  async updateComment(cardId: string, commentId: string, text: string): Promise<Card['comments'][0]> {
    try {
      const response = await axios.put(`${API_BASE_URL}/cards/${cardId}/comments/${commentId}`,
        { text },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update comment');
    }
  },

  async deleteComment(cardId: string, commentId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/cards/${cardId}/comments/${commentId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete comment');
    }
  },

  async addTimeEntry(cardId: string, hours: number, description: string = ''): Promise<Card['timeTracking']> {
    try {
      const response = await axios.post(`${API_BASE_URL}/cards/${cardId}/time`,
        { hours, description },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to add time entry');
    }
  },

  async getAssignedCards(filters?: { status?: string; priority?: string; dueDate?: string; page?: number; limit?: number }): Promise<{ data: Card[]; pagination: any }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }

      const response = await axios.get(`${API_BASE_URL}/cards/assigned-to-me?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {}
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch assigned cards');
    }
  }
};