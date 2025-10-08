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

// Folder APIs
export const folderApi = {
  // Create folder
  createFolder: async (cardId: string, data: { name: string; parentFolderId?: string | null }) => {
    const response = await apiClient.post(`/cards/${cardId}/folders`, data);
    return response.data;
  },

  // Get folder tree for card
  getFolders: async (cardId: string) => {
    const response = await apiClient.get(`/cards/${cardId}/folders`);
    return response.data.data;
  },

  // Get single folder
  getFolder: async (folderId: string) => {
    const response = await apiClient.get(`/folders/${folderId}`);
    return response.data.data;
  },

  // Rename folder
  renameFolder: async (folderId: string, name: string) => {
    const response = await apiClient.put(`/folders/${folderId}`, { name });
    return response.data;
  },

  // Delete folder
  deleteFolder: async (folderId: string) => {
    const response = await apiClient.delete(`/folders/${folderId}`);
    return response.data;
  },

  // Get breadcrumb for folder
  getBreadcrumb: async (folderId: string) => {
    const response = await apiClient.get(`/folders/${folderId}/breadcrumb`);
    return response.data.data;
  },
};

// File APIs
export const fileApi = {
  // Upload files
  uploadFiles: async (cardId: string, files: File[], folderId?: string | null) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (folderId) {
      formData.append('folderId', folderId);
    }

    const response = await apiClient.post(`/cards/${cardId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get files for card
  getFiles: async (cardId: string, folderId?: string | null) => {
    const params = folderId !== undefined ? { folderId: folderId || 'null' } : {};
    const response = await apiClient.get(`/cards/${cardId}/files`, { params });
    return response.data.data;
  },

  // Get all files with folder structure
  getAllFiles: async (cardId: string) => {
    const response = await apiClient.get(`/cards/${cardId}/files/all`);
    return response.data.data;
  },

  // Get download URL for file
  getDownloadUrl: async (fileId: string, cardId: string) => {
    const response = await apiClient.get(`/files/${fileId}/download`, {
      params: { cardId },
    });
    return response.data.data;
  },

  // Delete file
  deleteFile: async (fileId: string, cardId: string) => {
    const response = await apiClient.delete(`/files/${fileId}`, {
      params: { cardId },
    });
    return response.data;
  },

  // Download file
  downloadFile: async (fileId: string, cardId: string, filename: string) => {
    const downloadData = await fileApi.getDownloadUrl(fileId, cardId);

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadData.downloadUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return downloadData;
  },
};

const filesApi = {
  folderApi,
  fileApi,
};

export default filesApi;
