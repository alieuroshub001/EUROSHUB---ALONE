'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { SocketContext } from '@/contexts/SocketContext';

interface User {
  id: string;
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  employeeId?: string;
  avatar?: string;
  department?: string;
  position?: string;
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true
  });

  // Get socket context for cleanup on logout
  const socketContext = useContext(SocketContext);

  const checkAuth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      
      // Get token from cookie (same way your working getMe function does)
      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };

      let token = getCookie('token');
      console.log('useAuth: Token from cookie:', token ? 'exists' : 'not found');

      // Fallback to localStorage if no cookie token (same as getMe function)
      if (!token && typeof window !== 'undefined') {
        const localToken = localStorage.getItem('token');
        console.log('useAuth: Token from localStorage:', localToken ? 'exists' : 'not found');
        
        if (localToken) {
          // Restore token to cookie
          const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname.includes('vercel.app');
          const sameSite = isProduction ? 'None' : 'Lax';
          const secure = isProduction ? '; Secure' : '';
          document.cookie = `token=${localToken}; path=/; SameSite=${sameSite}${secure}`;
          token = localToken;
          console.log('useAuth: Restoring token to cookie from localStorage');
        }
      }

      if (!token) {
        console.log('useAuth: No token found, user not authenticated');
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
        return;
      }

      console.log('useAuth: Making request to', `${API_BASE_URL}/auth/me`);
      
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add Authorization header
        }
      });

      clearTimeout(timeoutId);

      console.log('useAuth: Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('useAuth: Response data:', data);

        // Handle both possible response structures
        const user = data.data?.user || data.user || data;
        
        if (user && user.id) {
          // Ensure both id and _id are set for compatibility
          const processedUser = {
            ...user,
            _id: user._id || user.id // Use _id if available, otherwise use id
          };
          console.log('useAuth: User found:', user.email);
          setAuthState({
            user: processedUser,
            isAuthenticated: true,
            loading: false
          });
        } else {
          console.error('useAuth: Invalid response structure:', data);
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      } else if (response.status === 429) {
        console.warn('useAuth: Rate limited, retrying in 2 seconds...');
        setTimeout(() => checkAuth(), 2000);
        return;
      } else {
        console.log('useAuth: Auth check failed with status:', response.status);
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('useAuth: Auth check timed out');
        } else if (error.message.includes('fetch')) {
          console.error('useAuth: Network error during auth check:', error.message);
        } else {
          console.error('useAuth: Auth check failed:', error.message);
        }
      } else {
        console.error('useAuth: Auth check failed with unknown error:', error);
      }

      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('useAuth: Login response:', data);

      if (response.ok) {
        // Handle both possible response structures
        const user = data.data?.user || data.user || data;
        
        if (user && user.id) {
          // Ensure both id and _id are set for compatibility
          const processedUser = {
            ...user,
            _id: user._id || user.id // Use _id if available, otherwise use id
          };
          setAuthState({
            user: processedUser,
            isAuthenticated: true,
            loading: false
          });
          return { success: true };
        } else {
          console.error('useAuth: Invalid login response structure:', data);
          return { success: false, message: 'Invalid response from server' };
        }
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('useAuth: Login failed:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('useAuth: Logout failed:', error);
    } finally {
      // Disconnect socket if available
      if (socketContext?.disconnect) {
        socketContext.disconnect();
      }

      // Clear client-side storage
      if (typeof window !== 'undefined') {
        // Clear cookies
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Clear localStorage
        localStorage.removeItem('token');
      }

      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });

      // Redirect to login page
      window.location.href = '/';
    }
  };

  const updateUser = (updatedUser: User) => {
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...authState,
    login,
    logout,
    updateUser,
    checkAuth
  };
};