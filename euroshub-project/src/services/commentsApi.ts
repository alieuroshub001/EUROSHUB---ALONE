import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Create axios instance with credentials
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const commentsApi = {
  // Add comment
  addComment: async (cardId: string, data: { text: string; mentions?: string[] }) => {
    const response = await apiClient.post(`/cards/${cardId}/comments`, data);
    return response.data;
  },

  // Get comments
  getComments: async (cardId: string) => {
    const response = await apiClient.get(`/cards/${cardId}/comments`);
    return response.data.data;
  },

  // Edit comment
  editComment: async (commentId: string, data: { text: string; cardId: string }) => {
    const response = await apiClient.put(`/comments/${commentId}`, data);
    return response.data;
  },

  // Delete comment
  deleteComment: async (commentId: string, cardId: string) => {
    const response = await apiClient.delete(`/comments/${commentId}`, {
      params: { cardId },
    });
    return response.data;
  },

  // Add reaction
  addReaction: async (commentId: string, data: { emoji: string; cardId: string }) => {
    const response = await apiClient.post(`/comments/${commentId}/reactions`, data);
    return response.data;
  },

  // Remove reaction
  removeReaction: async (commentId: string, emoji: string, cardId: string) => {
    const response = await apiClient.delete(`/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`, {
      params: { cardId },
    });
    return response.data;
  },
};

export default commentsApi;
