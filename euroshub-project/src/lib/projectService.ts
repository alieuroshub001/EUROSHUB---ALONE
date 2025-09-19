import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Types
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectVisibility = 'private' | 'team' | 'company';
export type ProjectRole = 'project_manager' | 'developer' | 'designer' | 'tester' | 'viewer' | 'client_viewer';

export interface ProjectMember {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  } | null;
  role: ProjectRole;
  joinedAt: string;
  addedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface Project {
  _id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate?: string;
  estimatedHours: number;
  actualHours: number;
  budget: {
    amount: number;
    currency: string;
  };
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
  members: ProjectMember[];
  tags: string[];
  isArchived: boolean;
  visibility: ProjectVisibility;
  metadata: {
    totalTasks: number;
    completedTasks: number;
    totalBoards: number;
  };
  completionPercentage: number;
  isOverdue: boolean;
  userRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  priority?: ProjectPriority;
  budget?: {
    amount: number;
    currency: string;
  };
  client?: string;
  tags?: string[];
  visibility?: ProjectVisibility;
  estimatedHours?: number;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: ProjectPriority;
  status?: ProjectStatus;
  budget?: {
    amount?: number;
    currency?: string;
  };
  client?: string;
  tags?: string[];
  visibility?: ProjectVisibility;
  estimatedHours?: number;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProjectListResponse {
  data: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AddMemberRequest {
  userId: string;
  role: ProjectRole;
}

export interface UpdateMemberRequest {
  role: ProjectRole;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const projectService = {
  // Projects
  async getProjects(filters?: ProjectFilters): Promise<ProjectListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(`${API_BASE_URL}/projects?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });

      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch projects');
    }
  },

  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch project');
    }
  },

  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects`, projectData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to create project');
    }
  },

  async updateProject(projectId: string, projectData: UpdateProjectRequest): Promise<Project> {
    try {
      const response = await axios.put(`${API_BASE_URL}/projects/${projectId}`, projectData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update project');
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to delete project');
    }
  },

  async archiveProject(projectId: string, archive: boolean = true): Promise<Project> {
    try {
      const response = await axios.put(`${API_BASE_URL}/projects/${projectId}/archive`,
        { archive },
        {
          headers: getAuthHeaders(),
          withCredentials: true,
        }
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to archive project');
    }
  },

  // Project Members
  async getMembers(projectId: string): Promise<{ members: ProjectMember[], owner: { _id: string; firstName: string; lastName: string; avatar?: string; email: string } }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/members`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch members');
    }
  },

  async addMember(projectId: string, memberData: AddMemberRequest): Promise<ProjectMember[]> {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/members`, memberData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to add member');
    }
  },

  async updateMemberRole(projectId: string, memberId: string, memberData: UpdateMemberRequest): Promise<ProjectMember[]> {
    try {
      const response = await axios.put(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, memberData, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update member role');
    }
  },

  async removeMember(projectId: string, memberId: string): Promise<ProjectMember[]> {
    try {
      const response = await axios.delete(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to remove member');
    }
  },

  // Project Activities
  async getProjectActivities(projectId: string, options?: { limit?: number; skip?: number; types?: string[] }) {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.skip) params.append('skip', options.skip.toString());
        if (options.types && options.types.length > 0) {
          params.append('types', options.types.join(','));
        }
      }

      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/activities?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch project activities');
    }
  }
};