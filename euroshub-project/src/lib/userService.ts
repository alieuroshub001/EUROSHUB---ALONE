import axios from 'axios';
import { getAuthToken } from './auth';
import { UserRole } from './permissions';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  department?: string;
  position?: string;
}

export interface UpdateUserRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt?: string;
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

export const userService = {
  async getUsers(): Promise<User[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/user-management/users`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.users || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch users');
    }
  },

  async createUser(userData: CreateUserRequest): Promise<{ user: User; emailSent: boolean; temporaryPassword?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/user-management/users`, userData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return {
        user: response.data.user,
        emailSent: response.data.emailSent,
        temporaryPassword: response.data.temporaryPassword,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } };
      if (err.response?.data?.errors) {
        throw {
          message: err.response.data.message,
          errors: err.response.data.errors,
        };
      }
      throw new Error(err.response?.data?.message || 'Failed to create user');
    }
  },

  async updateUser(userData: UpdateUserRequest): Promise<User> {
    try {
      const response = await axios.put(`${API_BASE_URL}/user-management/users`, userData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } };
      if (err.response?.data?.errors) {
        throw {
          message: err.response.data.message,
          errors: err.response.data.errors,
        };
      }
      throw new Error(err.response?.data?.message || 'Failed to update user');
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/user-management/users?id=${userId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete user');
    }
  },
};