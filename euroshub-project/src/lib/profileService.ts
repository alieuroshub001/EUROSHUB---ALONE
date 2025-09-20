import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  employeeId?: string;
  phone?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt?: string;
  avatar?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

const getAuthHeadersForFormData = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
  };
};

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data.user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch profile');
    }
  },

  async updateProfile(profileData: ProfileUpdateRequest): Promise<UserProfile> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/profile`, profileData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data.user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } };
      if (err.response?.data?.errors) {
        throw {
          message: err.response.data.message,
          errors: err.response.data.errors,
        };
      }
      throw new Error(err.response?.data?.message || 'Failed to update profile');
    }
  },

  async changePassword(passwordData: PasswordChangeRequest): Promise<void> {
    try {
      await axios.put(`${API_BASE_URL}/api/profile/password`, passwordData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } };
      if (err.response?.data?.errors) {
        throw {
          message: err.response.data.message,
          errors: err.response.data.errors,
        };
      }
      throw new Error(err.response?.data?.message || 'Failed to change password');
    }
  },

  async uploadAvatar(file: File): Promise<UserProfile> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await axios.post(`${API_BASE_URL}/api/profile/avatar`, formData, {
        headers: getAuthHeadersForFormData(),
        withCredentials: true,
      });
      return response.data.data.user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to upload avatar');
    }
  },

  async deleteAvatar(): Promise<UserProfile> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/profile/avatar`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data.user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete avatar');
    }
  },
};