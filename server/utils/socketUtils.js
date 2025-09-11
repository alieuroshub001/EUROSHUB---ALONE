class SocketUtils {
  constructor(socketManager) {
    this.socketManager = socketManager;
  }

  // Notification utilities
  async notifyUserCreated(createdUser, createdBy) {
    // Notify the created user
    this.socketManager.notifyUser(createdUser._id, 'account-created', {
      message: 'Your account has been created successfully',
      user: {
        id: createdUser._id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        role: createdUser.role
      },
      createdBy: {
        id: createdBy._id,
        firstName: createdBy.firstName,
        lastName: createdBy.lastName,
        role: createdBy.role
      },
      timestamp: new Date()
    });

    // Notify admins about new user creation
    this.socketManager.notifyRole('admin', 'user-created', {
      user: {
        id: createdUser._id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        role: createdUser.role
      },
      createdBy: {
        id: createdBy._id,
        firstName: createdBy.firstName,
        lastName: createdBy.lastName,
        role: createdBy.role
      },
      timestamp: new Date()
    });
  }

  async notifyPasswordChanged(userId) {
    this.socketManager.notifyUser(userId, 'password-changed', {
      message: 'Your password has been changed successfully',
      timestamp: new Date(),
      type: 'security'
    });
  }

  async notifyAccountStatusChange(userId, isActive, changedBy) {
    const status = isActive ? 'activated' : 'deactivated';
    
    this.socketManager.notifyUser(userId, 'account-status-changed', {
      message: `Your account has been ${status}`,
      isActive,
      changedBy: {
        id: changedBy._id,
        firstName: changedBy.firstName,
        lastName: changedBy.lastName,
        role: changedBy.role
      },
      timestamp: new Date(),
      type: 'account'
    });
  }

  // Project management utilities
  async notifyProjectCreated(project, createdBy, members = []) {
    // Notify all project members
    members.forEach(memberId => {
      this.socketManager.notifyUser(memberId, 'project-created', {
        project: {
          id: project._id,
          name: project.name,
          description: project.description,
          status: project.status
        },
        createdBy: {
          id: createdBy._id,
          firstName: createdBy.firstName,
          lastName: createdBy.lastName,
          role: createdBy.role
        },
        timestamp: new Date(),
        type: 'project'
      });
    });

    // Notify managers about new project
    this.socketManager.notifyRole('admin', 'project-created', {
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        membersCount: members.length
      },
      createdBy: {
        id: createdBy._id,
        firstName: createdBy.firstName,
        lastName: createdBy.lastName,
        role: createdBy.role
      },
      timestamp: new Date()
    });
  }

  async notifyTaskAssigned(task, assignedTo, assignedBy) {
    this.socketManager.notifyUser(assignedTo, 'task-assigned', {
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        projectId: task.projectId
      },
      assignedBy: {
        id: assignedBy._id,
        firstName: assignedBy.firstName,
        lastName: assignedBy.lastName,
        role: assignedBy.role
      },
      timestamp: new Date(),
      type: 'task'
    });
  }

  async notifyTaskStatusChanged(task, oldStatus, newStatus, changedBy, projectMembers = []) {
    const notification = {
      task: {
        id: task._id,
        title: task.title,
        oldStatus,
        newStatus,
        projectId: task.projectId
      },
      changedBy: {
        id: changedBy._id,
        firstName: changedBy.firstName,
        lastName: changedBy.lastName,
        role: changedBy.role
      },
      timestamp: new Date(),
      type: 'task-status'
    };

    // Notify all project members
    projectMembers.forEach(memberId => {
      this.socketManager.notifyUser(memberId, 'task-status-changed', notification);
    });

    // Also broadcast to the project room
    if (task.projectId) {
      this.socketManager.notifyProject(task.projectId, 'task-status-changed', notification);
    }
  }

  // Meeting and deadline utilities
  async notifyMeetingScheduled(meeting, participants, scheduledBy) {
    const notification = {
      meeting: {
        id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        scheduledDate: meeting.scheduledDate,
        duration: meeting.duration,
        type: meeting.type
      },
      scheduledBy: {
        id: scheduledBy._id,
        firstName: scheduledBy.firstName,
        lastName: scheduledBy.lastName,
        role: scheduledBy.role
      },
      timestamp: new Date(),
      type: 'meeting'
    };

    participants.forEach(participantId => {
      this.socketManager.notifyUser(participantId, 'meeting-scheduled', notification);
    });
  }

  async notifyDeadlineApproaching(task, assignedUsers, daysRemaining) {
    const notification = {
      task: {
        id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        projectId: task.projectId
      },
      daysRemaining,
      urgency: daysRemaining <= 1 ? 'critical' : daysRemaining <= 3 ? 'high' : 'medium',
      timestamp: new Date(),
      type: 'deadline'
    };

    assignedUsers.forEach(userId => {
      this.socketManager.notifyUser(userId, 'deadline-approaching', notification);
    });
  }

  // System-wide notifications
  async broadcastSystemMaintenance(maintenanceInfo, excludeRoles = []) {
    const notification = {
      title: 'System Maintenance Scheduled',
      message: maintenanceInfo.message,
      scheduledTime: maintenanceInfo.scheduledTime,
      estimatedDuration: maintenanceInfo.estimatedDuration,
      type: 'system-maintenance',
      timestamp: new Date()
    };

    // Broadcast to all users except excluded roles
    const allRoles = ['superadmin', 'admin', 'client', 'hr', 'employee'];
    const targetRoles = allRoles.filter(role => !excludeRoles.includes(role));

    targetRoles.forEach(role => {
      this.socketManager.notifyRole(role, 'system-maintenance', notification);
    });
  }

  async broadcastAnnouncement(announcement, targetRoles = ['admin', 'hr', 'employee'], author) {
    const notification = {
      announcement: {
        id: announcement._id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority
      },
      author: {
        id: author._id,
        firstName: author.firstName,
        lastName: author.lastName,
        role: author.role
      },
      timestamp: new Date(),
      type: 'announcement'
    };

    targetRoles.forEach(role => {
      this.socketManager.notifyRole(role, 'announcement', notification);
    });
  }

  // Real-time activity feed
  async broadcastActivity(activity) {
    this.socketManager.broadcastToAll('activity-update', {
      activity: {
        id: activity._id,
        type: activity.type,
        description: activity.description,
        entityId: activity.entityId,
        entityType: activity.entityType
      },
      user: {
        id: activity.userId,
        firstName: activity.user?.firstName,
        lastName: activity.user?.lastName,
        role: activity.user?.role
      },
      timestamp: activity.timestamp || new Date(),
      type: 'activity'
    });
  }

  // Chat and messaging utilities
  async notifyDirectMessage(fromUser, toUser, message) {
    this.socketManager.notifyUser(toUser, 'direct-message', {
      message: {
        id: message._id,
        content: message.content,
        type: message.type
      },
      from: {
        id: fromUser._id,
        firstName: fromUser.firstName,
        lastName: fromUser.lastName,
        role: fromUser.role,
        avatar: fromUser.avatar
      },
      timestamp: new Date(),
      type: 'direct-message'
    });
  }

  // File sharing notifications
  async notifyFileShared(file, sharedWith, sharedBy, projectId = null) {
    const notification = {
      file: {
        id: file._id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url
      },
      sharedBy: {
        id: sharedBy._id,
        firstName: sharedBy.firstName,
        lastName: sharedBy.lastName,
        role: sharedBy.role
      },
      projectId,
      timestamp: new Date(),
      type: 'file-shared'
    };

    if (Array.isArray(sharedWith)) {
      sharedWith.forEach(userId => {
        this.socketManager.notifyUser(userId, 'file-shared', notification);
      });
    } else {
      this.socketManager.notifyUser(sharedWith, 'file-shared', notification);
    }
  }

  // Utility methods
  getOnlineUsers() {
    return this.socketManager.getOnlineUsers();
  }

  getUsersInProject(projectId) {
    return this.socketManager.getUsersInProject(projectId);
  }

  isUserOnline(userId) {
    return this.socketManager.connectedUsers.has(userId.toString());
  }
}

// Helper function to get socket utilities from app
const getSocketUtils = (app) => {
  const socketManager = app.get('socketManager');
  return new SocketUtils(socketManager);
};

module.exports = { SocketUtils, getSocketUtils };