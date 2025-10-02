import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Types
export interface Activity {
  _id: string;
  type: ActivityType;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  project?: {
    _id: string;
    title: string;
  } | null;
  board?: {
    _id: string;
    title: string;
  };
  list?: {
    _id: string;
    title: string;
  };
  card?: {
    _id: string;
    title: string;
  };
  targetUser?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  data?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldValue?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newValue?: any;
    field?: string;
    comment?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    additionalInfo?: any;
    projectTitle?: string; // Added this property
  };
  metadata: {
    entityName?: string;
    entityId?: string;
    changes?: Array<{
      field: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oldValue: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newValue: any;
    }>;
  };
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  // Project activities
  | 'project_created' | 'project_updated' | 'project_deleted' | 'project_archived'
  | 'project_member_added' | 'project_member_removed' | 'project_member_role_changed'
  // Board activities
  | 'board_created' | 'board_updated' | 'board_deleted' | 'board_archived'
  // List activities
  | 'list_created' | 'list_updated' | 'list_deleted' | 'list_moved'
  // Card activities
  | 'card_created' | 'card_updated' | 'card_deleted' | 'card_moved'
  | 'card_assigned' | 'card_unassigned' | 'card_completed' | 'card_reopened'
  | 'card_due_date_set' | 'card_due_date_changed' | 'card_comment_added'
  | 'card_attachment_added' | 'card_attachment_removed' | 'card_label_added'
  | 'card_label_removed' | 'card_checklist_item_completed';

export interface ActivityTypeInfo {
  type: ActivityType;
  label: string;
}

export interface ActivityStats {
  total: number;
  byType: Array<{
    _id: ActivityType;
    count: number;
  }>;
  daily: Array<{
    _id: string; // date in YYYY-MM-DD format
    count: number;
  }>;
  period: 'today' | 'week' | 'month' | 'year';
}

export interface DashboardActivityOptions {
  limit?: number;
  skip?: number;
}

export interface UserActivityOptions {
  limit?: number;
  skip?: number;
  types?: ActivityType[];
  projectId?: string;
}

export interface ProjectActivityOptions {
  limit?: number;
  skip?: number;
  types?: ActivityType[];
  startDate?: string;
  endDate?: string;
}

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const activityService = {
  async getDashboardActivities(options?: DashboardActivityOptions): Promise<Activity[]> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.skip) params.append('skip', options.skip.toString());
      }

      const response = await axios.get(`${API_BASE_URL}/activities/dashboard?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch dashboard activities');
    }
  },

  async getUserActivities(userId?: string, options?: UserActivityOptions): Promise<Activity[]> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.skip) params.append('skip', options.skip.toString());
        if (options.types && options.types.length > 0) {
          params.append('types', options.types.join(','));
        }
        if (options.projectId) params.append('projectId', options.projectId);
      }

      const endpoint = userId
        ? `${API_BASE_URL}/activities/user/${userId}?${params.toString()}`
        : `${API_BASE_URL}/activities/my-activities?${params.toString()}`;

      const response = await axios.get(endpoint, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch user activities');
    }
  },

  async getMyActivities(options?: UserActivityOptions): Promise<Activity[]> {
    return this.getUserActivities(undefined, options);
  },

  async getProjectActivities(projectId: string, options?: ProjectActivityOptions): Promise<Activity[]> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.skip) params.append('skip', options.skip.toString());
        if (options.types && options.types.length > 0) {
          params.append('types', options.types.join(','));
        }
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
      }

      const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/activities?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch project activities');
    }
  },

  async getCardActivities(cardId: string, options?: { limit?: number; skip?: number }): Promise<Activity[]> {
    try {
      const params = new URLSearchParams();
      if (options) {
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.skip) params.append('skip', options.skip.toString());
      }

      const response = await axios.get(`${API_BASE_URL}/activities/card/${cardId}?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch card activities');
    }
  },

  async getActivityTypes(): Promise<ActivityTypeInfo[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/activities/types`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch activity types');
    }
  },

  async getActivityStats(period: 'today' | 'week' | 'month' | 'year' = 'week'): Promise<ActivityStats> {
    try {
      const params = new URLSearchParams();
      params.append('period', period);

      const response = await axios.get(`${API_BASE_URL}/activities/stats?${params.toString()}`, {
        headers: getAuthHeaders(),
        withCredentials: true,
      });
      return response.data.data || {
        total: 0,
        byType: [],
        daily: [],
        period
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      throw new Error(err.response?.data?.message || 'Failed to fetch activity statistics');
    }
  },

  // Helper methods for activity formatting
  formatActivityMessage(activity: Activity): string {
    const userName = `${activity.user.firstName} ${activity.user.lastName}`;
    const entityName = activity.metadata.entityName || 'item';

    switch (activity.type) {
      case 'project_created':
        return `${userName} created project "${entityName}"`;
      case 'project_updated':
        return `${userName} updated project "${entityName}"`;
      case 'project_member_added':
        const addedUser = activity.targetUser ? `${activity.targetUser.firstName} ${activity.targetUser.lastName}` : 'user';
        const projectTitle = activity.project?.title || activity.data?.projectTitle || activity.metadata?.entityName || 'Unknown Project';
        return `${userName} added ${addedUser} to project "${projectTitle}"`;
      case 'project_member_role_changed':
        const changedUser = activity.targetUser ? `${activity.targetUser.firstName} ${activity.targetUser.lastName}` : 'user';
        const oldRole = activity.data?.oldValue || 'role';
        const newRole = activity.data?.newValue || 'role';
        const roleProjectTitle = activity.project?.title || activity.data?.projectTitle || activity.metadata?.entityName || 'Unknown Project';
        return `${userName} changed ${changedUser}'s role from ${oldRole} to ${newRole} in project "${roleProjectTitle}"`;
      case 'board_created':
        return `${userName} created board "${entityName}"`;
      case 'card_created':
        return `${userName} created card "${entityName}" in ${activity.list?.title || 'list'}`;
      case 'card_assigned':
        return `${userName} assigned card "${activity.card?.title || entityName}"`;
      case 'card_completed':
        return `${userName} completed card "${activity.card?.title || entityName}"`;
      case 'card_comment_added':
        return `${userName} commented on "${activity.card?.title || entityName}"`;
      case 'card_moved':
        return `${userName} moved card "${activity.card?.title || entityName}"`;
      default:
        return `${userName} ${activity.description} ${entityName}`;
    }
  },

  getActivityIcon(type: ActivityType): string {
    switch (type) {
      case 'project_created':
      case 'project_updated':
        return '📁';
      case 'project_member_added':
      case 'project_member_removed':
        return '👥';
      case 'board_created':
      case 'board_updated':
        return '📋';
      case 'list_created':
      case 'list_updated':
        return '📝';
      case 'card_created':
        return '➕';
      case 'card_updated':
        return '✏️';
      case 'card_moved':
        return '🔄';
      case 'card_assigned':
        return '👤';
      case 'card_completed':
        return '✅';
      case 'card_comment_added':
        return '💬';
      default:
        return '📌';
    }
  },

  getActivityColor(type: ActivityType): string {
    switch (type) {
      case 'project_created':
      case 'board_created':
      case 'list_created':
      case 'card_created':
        return 'text-green-600 bg-green-100';
      case 'project_updated':
      case 'board_updated':
      case 'list_updated':
      case 'card_updated':
        return 'text-blue-600 bg-blue-100';
      case 'project_deleted':
      case 'board_deleted':
      case 'list_deleted':
      case 'card_deleted':
        return 'text-red-600 bg-red-100';
      case 'card_completed':
        return 'text-green-600 bg-green-100';
      case 'card_assigned':
        return 'text-purple-600 bg-purple-100';
      case 'card_moved':
        return 'text-orange-600 bg-orange-100';
      case 'card_comment_added':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
};