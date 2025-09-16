'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/me', {
        credentials: 'include'
      });

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
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
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
      await fetch('http://localhost:5001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
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