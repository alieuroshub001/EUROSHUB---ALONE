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

        // Try different cookie configurations
        const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname.includes('vercel.app');
        const cookieOptions = {
          expires: 7, // 7 days
          path: '/',
          sameSite: isProduction ? 'none' as const : 'lax' as const,
          secure: isProduction
          // Note: domain is omitted to use current domain
        };

        console.log('Login: Cookie options:', cookieOptions);
        Cookies.set('token', response.data.token, cookieOptions);

        // Wait a moment for cookie to be set
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify the cookie was set
        const savedToken = Cookies.get('token');
        console.log('Login: Verified token in cookie:', savedToken);

        // If cookie still not set, try alternative storage
        if (!savedToken) {
          console.warn('Login: Cookie not set, trying localStorage as fallback');
          localStorage.setItem('token', response.data.token);
        }
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
      const token = getAuthToken();
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        withCredentials: true,
        headers
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all client-side storage
      Cookies.remove('token', { path: '/' });
      localStorage.removeItem('token');

      // Force redirect to login page
      window.location.href = '/';
    }
  },

  getMe: async (): Promise<User | null> => {
    try {
      let token = Cookies.get('token');
      console.log('getMe: Token from cookie:', token ? 'exists' : 'not found');
      console.log('getMe: Token value:', token);

      // If no token in cookie, try localStorage
      if (!token) {
        token = localStorage.getItem('token') || undefined;
        console.log('getMe: Token from localStorage:', token ? 'exists' : 'not found');

        // If found in localStorage, set it back to cookie
        if (token) {
          console.log('getMe: Restoring token to cookie from localStorage');
          const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname.includes('vercel.app');
          Cookies.set('token', token, {
            expires: 7,
            path: '/',
            sameSite: isProduction ? 'none' as const : 'lax' as const,
            secure: isProduction
          });
        }
      }

      if (!token) {
        console.log('getMe: No token found in cookie or localStorage, returning null');
        return null;
      }

      console.log('🔍 getMe: API_BASE_URL:', API_BASE_URL);
      console.log('🔍 getMe: Making request to', `${API_BASE_URL}/auth/me`);

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('getMe: Response status:', response.status);
      console.log('getMe: Response data:', response.data);

      if (response.data && response.data.data && response.data.data.user) {
        console.log('getMe: User found:', response.data.data.user.email);
        return response.data.data.user;
      } else {
        console.log('getMe: Invalid response structure:', response.data);
        return null;
      }
    } catch (error) {
      console.error('Get user error:', error);
      if (axios.isAxiosError(error)) {
        console.error('getMe: Response status:', error.response?.status);
        console.error('getMe: Response data:', error.response?.data);
        console.error('getMe: Request URL:', error.config?.url);
      }
      Cookies.remove('token');
      localStorage.removeItem('token');
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
      const url = `${API_BASE_URL}/auth/verify-email/${token}`;
      console.log('🔍 Calling verification API URL:', url);
      console.log('🔍 API_BASE_URL:', API_BASE_URL);

      const response = await axios.get(url, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Verification API success:', response.data);
      console.log('✅ Response status:', response.status);
      return response.data;
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: { message: string };
          status?: number;
          statusText?: string;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request?: any;
        message?: string;
        code?: string;
      };

      console.error('❌ Verification API error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message,
        code: axiosError.code,
        url: `${API_BASE_URL}/auth/verify-email/${token}`,
        hasResponse: !!axiosError.response,
        hasRequest: !!axiosError.request
      });

      if (!axiosError.response && axiosError.request) {
        // Network error - request was made but no response received
        throw {
          success: false,
          message: 'Network error: Could not reach verification server'
        };
      }

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
  const cookieToken = Cookies.get('token');
  if (cookieToken) return cookieToken;

  const localToken = localStorage.getItem('token');
  return localToken || undefined;
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