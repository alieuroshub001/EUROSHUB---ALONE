import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // Full name for header display
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
  data: {
    user: User;
  };
  message?: string;
}

export interface LoginError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  requiresEmailVerification?: boolean;
  email?: string;
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
        console.log('Login: Setting token cookie:', response.data.token);
        Cookies.set('token', response.data.token, {
          expires: 7, // 7 days
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });

        // Verify the cookie was set
        const savedToken = Cookies.get('token');
        console.log('Login: Verified token in cookie:', savedToken);
      }
      
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: LoginError } };
      if (axiosError.response?.data) {
        throw axiosError.response.data;
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
          Authorization: `Bearer ${Cookies.get('token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('token');
    }
  },

  getMe: async (): Promise<User | null> => {
    try {
      const token = Cookies.get('token');
      console.log('getMe: Token from cookie:', token ? 'exists' : 'not found');
      console.log('getMe: Token value:', token);

      if (!token) return null;

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data.data.user;
    } catch (error) {
      console.error('Get user error:', error);
      Cookies.remove('token');
      return null;
    }
  },

  resendVerificationEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/resend-verification`, {
        email
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message: string } } };
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Failed to resend verification email'
      };
    }
  },

  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/verify-email/${token}`);
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message: string } } };
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Email verification failed'
      };
    }
  },

  requestPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/request-password-reset`, {
        email
      });
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message: string } } };
      throw {
        success: false,
        message: axiosError.response?.data?.message || 'Failed to request password reset'
      };
    }
  }
};

export const getAuthToken = (): string | undefined => {
  return Cookies.get('token');
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