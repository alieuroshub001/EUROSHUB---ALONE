import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'hr' | 'employee' | 'client';
  phone?: string;
  department?: string;
  position?: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface LoginError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Store token in cookie for persistence
        Cookies.set('auth_token', response.data.token, {
          expires: 7, // 7 days
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  },

  logout: async (): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${Cookies.get('auth_token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('auth_token');
    }
  },

  getMe: async (): Promise<User | null> => {
    try {
      const token = Cookies.get('auth_token');
      if (!token) return null;

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data.user;
    } catch (error) {
      console.error('Get user error:', error);
      Cookies.remove('auth_token');
      return null;
    }
  }
};

export const getAuthToken = (): string | undefined => {
  return Cookies.get('auth_token');
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const getRoleDashboardPath = (role: string): string => {
  switch (role) {
    case 'superadmin':
      return '/superadmin';
    case 'admin':
      return '/admin';
    case 'hr':
      return '/hr';
    case 'employee':
      return '/employee';
    case 'client':
      return '/client';
    default:
      return '/';
  }
};