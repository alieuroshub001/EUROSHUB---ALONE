import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Types
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectVisibility = 'private' | 'team' | 'company';
export type ProjectRole = 'project_manager' | 'developer' | 'designer' | 'tester' | 'viewer' | 'client_viewer';
export type UserRole = 'superadmin' | 'admin' | 'hr' | 'employee' | 'client';

export interface User {
  _id: string;
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface ProjectMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
    role: UserRole;
  };
  role: 'member' | 'leader';
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
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
  } | null;
  owner: {
    _id: string;
    name: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
    role: UserRole;
  };
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
  },

  // Permission helpers
  canUserCreateProjects(userRole: UserRole): boolean {
    return ['superadmin', 'admin', 'hr'].includes(userRole);
  },

  canUserViewAllProjects(userRole: UserRole): boolean {
    return ['superadmin', 'admin', 'hr'].includes(userRole);
  },

  canUserEditAllProjects(userRole: UserRole): boolean {
    return ['superadmin', 'admin'].includes(userRole);
  },

  canUserDeleteAllProjects(userRole: UserRole): boolean {
    return ['superadmin', 'admin'].includes(userRole);
  },

  canUserManageAllMembers(userRole: UserRole): boolean {
    return ['superadmin', 'admin', 'hr'].includes(userRole);
  },

  canUserEditProject(userRole: UserRole, project: Project, userId: string): boolean {
    // Superadmin and admin can edit all projects
    if (['superadmin', 'admin'].includes(userRole)) {
      return true;
    }

    // Project owner can edit
    if (project.owner?._id === userId) {
      return true;
    }

    // HR can edit projects they created or manage
    if (userRole === 'hr' && project.owner?._id === userId) {
      return true;
    }

    // Team leaders can edit projects
    const member = project.members.find(m => m.user?._id === userId);
    if (member && member.role === 'leader') {
      return true;
    }

    return false;
  },

  canUserDeleteProject(userRole: UserRole, project: Project, userId: string): boolean {
    // Only superadmin and admin can delete projects
    if (['superadmin', 'admin'].includes(userRole)) {
      return true;
    }

    // Project owner can delete (if they have sufficient role)
    if (project.owner?._id === userId && ['admin', 'hr'].includes(userRole)) {
      return true;
    }

    return false;
  },

  canUserManageProjectMembers(userRole: UserRole, project: Project, userId: string): boolean {
    // Superadmin, admin, and HR can manage all members
    if (['superadmin', 'admin', 'hr'].includes(userRole)) {
      return true;
    }

    // Project owner can manage members
    if (project.owner?._id === userId) {
      return true;
    }

    // Team leaders can manage some members
    const member = project.members.find(m => m.user?._id === userId);
    if (member && member.role === 'leader') {
      return true;
    }

    return false;
  },

  // Alias methods for ProjectMembers component
  canUserManageMembers(userRole: UserRole, project: Project, userId: string): boolean {
    return this.canUserManageProjectMembers(userRole, project, userId);
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/user-management/users`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch users');
    }
  },

  async addProjectMember(projectId: string, userId: string, role: 'member' | 'leader'): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/projects/${projectId}/members`, {
        userId,
        role
      }, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to add project member');
    }
  },

  async removeProjectMember(projectId: string, memberId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to remove project member');
    }
  },

  async updateMemberRole(projectId: string, memberId: string, role: 'member' | 'leader'): Promise<void> {
    try {
      await axios.put(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
        role
      }, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to update member role');
    }
  }
};