'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { SocketContext } from '@/contexts/SocketContext';

interface User {
  id: string;
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

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('Auth check response:', data);

        if (data.data && data.data.user) {
          setAuthState({
            user: data.data.user,
            isAuthenticated: true,
            loading: false
          });
        } else {
          console.error('Invalid auth response structure:', data);
          setAuthState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      } else if (response.status === 429) {
        console.warn('Rate limited, retrying in 2 seconds...');
        setTimeout(() => checkAuth(), 2000);
        return;
      } else {
        console.log('Auth check failed with status:', response.status);
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Auth check timed out');
        } else if (error.message.includes('fetch')) {
          console.error('Network error during auth check:', error.message);
        } else {
          console.error('Auth check failed:', error.message);
        }
      } else {
        console.error('Auth check failed with unknown error:', error);
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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok) {
        if (data.data && data.data.user) {
          setAuthState({
            user: data.data.user,
            isAuthenticated: true,
            loading: false
          });
          return { success: true };
        } else {
          console.error('Invalid login response structure:', data);
          return { success: false, message: 'Invalid response from server' };
        }
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
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