import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface Comment {
  _id: string;
  text: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  mentions: string[];
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const getFormDataHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    // Don't set Content-Type for FormData, let browser set it
  };
};

export const cardService = {
  // Comments
  async addComment(cardId: string, text: string, mentions: string[] = []): Promise<Comment> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cards/${cardId}/comments`, {
        text,
        mentions
      }, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to add comment');
    }
  },

  async updateComment(cardId: string, commentId: string, text: string): Promise<Comment> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/cards/${cardId}/comments/${commentId}`, {
        text
      }, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update comment');
    }
  },

  async deleteComment(cardId: string, commentId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/api/cards/${cardId}/comments/${commentId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete comment');
    }
  },

  // File Attachments
  async uploadFile(cardId: string, file: File): Promise<Attachment> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/api/cards/${cardId}/attachments`, formData, {
        headers: getFormDataHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to upload file');
    }
  },

  async uploadImage(cardId: string, image: File): Promise<Attachment> {
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await axios.post(`${API_BASE_URL}/api/cards/${cardId}/images`, formData, {
        headers: getFormDataHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to upload image');
    }
  },

  async uploadMultipleFiles(cardId: string, files: File[]): Promise<Attachment[]> {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(`${API_BASE_URL}/api/cards/${cardId}/attachments/multiple`, formData, {
        headers: getFormDataHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to upload files');
    }
  },

  async deleteAttachment(cardId: string, attachmentId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/api/cards/${cardId}/attachments/${attachmentId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete attachment');
    }
  },

  // Card Details
  async getCard(cardId: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cards/${cardId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch card');
    }
  },

  // Helper function to format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Helper function to check if file is an image
  isImage: (filename: string): boolean => {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);
  },

  // Helper function to get file icon based on type
  getFileIcon: (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.startsWith('video/')) return '🎥';
    if (mimetype.startsWith('audio/')) return '🎵';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return '🗜️';
    return '📎';
  },

  // Download attachment with proper filename
  async downloadAttachment(cardId: string, attachmentId: string): Promise<void> {
    try {
      const downloadUrl = `${API_BASE_URL}/api/cards/${cardId}/attachments/${attachmentId}/download`;

      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to download attachment');
    }
  }
};