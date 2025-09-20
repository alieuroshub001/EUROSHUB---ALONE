import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface PasswordResetRequest {
  id: string;
  userEmail: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: string;
  processedAt?: string;
  processor?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  notes?: string;
  emailSent?: boolean;
  requestAge: number;
}

export interface ProcessRequestData {
  requestId: string;
  action: 'approve' | 'reject';
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  requests?: T[];
  pagination?: {
    current: number;
    total: number;
    count: number;
    totalRequests: number;
  };
}

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const passwordResetService = {
  async getPendingRequests(page: number = 1, limit: number = 50): Promise<{ requests: PasswordResetRequest[]; pagination: ApiResponse<never>['pagination'] }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/password-reset/pending`, {
        headers: getAuthHeaders(),
        params: { page, limit },
        withCredentials: true,
      });
      return {
        requests: response.data.requests || [],
        pagination: response.data.pagination
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch pending requests');
    }
  },

  async getAllRequests(page: number = 1, limit: number = 50, status?: string, userEmail?: string): Promise<{ requests: PasswordResetRequest[]; pagination: ApiResponse<never>['pagination'] }> {
    try {
      const params: Record<string, string | number> = { page, limit };
      if (status && status !== 'all') params.status = status;
      if (userEmail) params.userEmail = userEmail;

      const response = await axios.get(`${API_BASE_URL}/api/password-reset/all`, {
        headers: getAuthHeaders(),
        params,
        withCredentials: true,
      });
      return {
        requests: response.data.requests || [],
        pagination: response.data.pagination
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch requests');
    }
  },

  async processRequest(requestData: ProcessRequestData): Promise<{ message: string; newPassword?: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/password-reset/process`, requestData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return {
        message: response.data.message,
        newPassword: response.data.newPassword
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to process request');
    }
  }
};