import axios from 'axios';
import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export interface TaskAssignmentNotification {
  userId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectTitle: string;
  assignedBy: string;
}

export interface EmailNotificationRequest {
  type: 'task_assignment' | 'task_due_reminder' | 'project_update';
  recipients: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export const notificationService = {
  // Send task assignment notification
  async sendTaskAssignmentNotification(notificationData: TaskAssignmentNotification): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/task-assignment`, notificationData, {
        headers: getAuthHeaders(),
        withCredentials: true,
        timeout: 5000, // 5 second timeout
      });
      return response.data.success || true;
    } catch (error: unknown) {
      // Log warning instead of error to reduce console noise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn('Task assignment notification service unavailable:', (error as any)?.code || 'Network error');
      // Don't throw error to avoid breaking task assignment flow
      return false;
    }
  },

  // Send bulk email notifications
  async sendEmailNotification(notificationData: EmailNotificationRequest): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE_URL}/notifications/email`, notificationData, {
        headers: getAuthHeaders(),
        withCredentials: true,
        timeout: 5000, // 5 second timeout
      });
      return response.data.success || true;
    } catch (error: unknown) {
      // Log warning instead of error to reduce console noise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn('Email notification service unavailable:', (error as any)?.code || 'Network error');
      // Don't throw error to avoid breaking main functionality
      return false;
    }
  },

  // Send notification to multiple users when assigned to a task
  async notifyTaskAssignment(
    userIds: string[],
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectTitle: string,
    assignedByUserId: string
  ): Promise<boolean> {
    try {
      const promises = userIds.map(userId =>
        this.sendTaskAssignmentNotification({
          userId,
          taskId,
          taskTitle,
          projectId,
          projectTitle,
          assignedBy: assignedByUserId
        })
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;

      console.log(`Task assignment notifications: ${successCount}/${userIds.length} sent successfully`);
      return successCount > 0;
    } catch (error: unknown) {
      console.error('Failed to send task assignment notifications:', error);
      return false;
    }
  }
};

export default notificationService;