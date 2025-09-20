const Activity = require('../models/Activity');
const Project = require('../models/Project');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const automationService = require('../services/automationService');

class ProjectSocketManager {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.io = socketManager.io;
    this.setupProjectEventHandlers();
  }

  setupProjectEventHandlers() {
    this.io.on('connection', (socket) => {
      // Project management specific events
      this.setupProjectEvents(socket);
      this.setupBoardEvents(socket);
      this.setupListEvents(socket);
      this.setupCardEvents(socket);
      this.setupActivityEvents(socket);
    });
  }

  setupProjectEvents(socket) {
    // Join project room
    socket.on('join_room', (data) => {
      const { room } = data;
      socket.join(room);
      console.log(`User ${socket.userId} joined room: ${room}`);
    });

    // Leave project room
    socket.on('leave_room', (data) => {
      const { room } = data;
      socket.leave(room);
      console.log(`User ${socket.userId} left room: ${room}`);
    });

    // Project member added
    socket.on('project_member_added', async (data) => {
      const { projectId, member, addedBy } = data;

      try {
        // Broadcast to project room
        this.io.to(`project:${projectId}`).emit('project_member_added', {
          projectId,
          member,
          addedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        // Notify the new member directly
        this.socketManager.notifyUser(member.user._id, 'project_invitation', {
          projectId,
          projectName: data.projectName,
          addedBy: `${socket.user.firstName} ${socket.user.lastName}`,
          role: member.role
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'member_added', {
          memberName: member.user.name,
          role: member.role
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to add project member' });
      }
    });

    // Project member removed
    socket.on('project_member_removed', async (data) => {
      const { projectId, memberId, memberName } = data;

      try {
        this.io.to(`project:${projectId}`).emit('project_member_removed', {
          projectId,
          memberId,
          removedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'member_removed', {
          memberName
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to remove project member' });
      }
    });

    // Project updated
    socket.on('project_updated', async (data) => {
      const { projectId, updates } = data;

      try {
        this.io.to(`project:${projectId}`).emit('project_updated', {
          projectId,
          updates,
          updatedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'project_updated', updates);

      } catch (error) {
        socket.emit('error', { message: 'Failed to update project' });
      }
    });
  }

  setupBoardEvents(socket) {
    // Board created
    socket.on('board_created', async (data) => {
      const { projectId, board } = data;

      try {
        this.io.to(`project:${projectId}`).emit('board_created', {
          projectId,
          board: {
            ...board,
            createdBy: {
              id: socket.userId,
              name: `${socket.user.firstName} ${socket.user.lastName}`
            }
          },
          timestamp: new Date()
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'board_created', {
          boardName: board.title
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to create board' });
      }
    });

    // Board updated
    socket.on('board_updated', async (data) => {
      const { projectId, boardId, updates } = data;

      try {
        this.io.to(`project:${projectId}`).emit('board_updated', {
          projectId,
          boardId,
          updates,
          updatedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        // Also emit to board-specific room
        this.io.to(`board:${boardId}`).emit('board_updated', {
          boardId,
          updates,
          updatedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to update board' });
      }
    });

    // Board deleted
    socket.on('board_deleted', async (data) => {
      const { projectId, boardId, boardName } = data;

      try {
        this.io.to(`project:${projectId}`).emit('board_deleted', {
          projectId,
          boardId,
          deletedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'board_deleted', {
          boardName
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to delete board' });
      }
    });
  }

  setupListEvents(socket) {
    // List created
    socket.on('list_created', async (data) => {
      const { projectId, boardId, list } = data;

      try {
        this.io.to(`project:${projectId}`).emit('list_created', {
          projectId,
          boardId,
          list: {
            ...list,
            createdBy: {
              id: socket.userId,
              name: `${socket.user.firstName} ${socket.user.lastName}`
            }
          },
          timestamp: new Date()
        });

        this.io.to(`board:${boardId}`).emit('list_created', {
          boardId,
          list,
          timestamp: new Date()
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'list_created', {
          listName: list.title,
          boardId
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to create list' });
      }
    });

    // List updated
    socket.on('list_updated', async (data) => {
      const { projectId, boardId, listId, updates } = data;

      try {
        this.io.to(`project:${projectId}`).emit('list_updated', {
          projectId,
          boardId,
          listId,
          updates,
          updatedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        this.io.to(`board:${boardId}`).emit('list_updated', {
          boardId,
          listId,
          updates,
          timestamp: new Date()
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to update list' });
      }
    });
  }

  setupCardEvents(socket) {
    // Card created
    socket.on('card_created', async (data) => {
      const { projectId, boardId, listId, card } = data;

      try {
        const cardData = {
          projectId,
          boardId,
          listId,
          card: {
            ...card,
            createdBy: {
              id: socket.userId,
              name: `${socket.user.firstName} ${socket.user.lastName}`
            }
          },
          timestamp: new Date()
        };

        this.io.to(`project:${projectId}`).emit('card_created', cardData);
        this.io.to(`board:${boardId}`).emit('card_created', cardData);

        // Notify assigned users
        if (card.assignedTo && card.assignedTo.length > 0) {
          card.assignedTo.forEach(userId => {
            this.socketManager.notifyUser(userId, 'card_assigned', {
              cardId: card._id,
              cardTitle: card.title,
              assignedBy: `${socket.user.firstName} ${socket.user.lastName}`,
              projectId
            });
          });
        }

        // Create activity
        await this.createActivity(projectId, socket.userId, 'card_created', {
          cardTitle: card.title,
          listId,
          boardId
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to create card' });
      }
    });

    // Card updated
    socket.on('card_updated', async (data) => {
      const { projectId, boardId, listId, cardId, updates } = data;

      try {
        const updateData = {
          projectId,
          boardId,
          listId,
          cardId,
          updates,
          updatedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        };

        this.io.to(`project:${projectId}`).emit('card_updated', updateData);
        this.io.to(`board:${boardId}`).emit('card_updated', updateData);

        // If assignees were updated, notify them
        if (updates.assignedTo) {
          updates.assignedTo.forEach(userId => {
            this.socketManager.notifyUser(userId, 'card_assigned', {
              cardId,
              cardTitle: updates.title || 'Card',
              assignedBy: `${socket.user.firstName} ${socket.user.lastName}`,
              projectId
            });
          });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to update card' });
      }
    });

    // Card moved
    socket.on('card_moved', async (data) => {
      const { projectId, boardId, cardId, sourceListId, targetListId, position } = data;

      try {
        const moveData = {
          projectId,
          boardId,
          cardId,
          sourceListId,
          targetListId,
          position,
          movedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        };

        this.io.to(`project:${projectId}`).emit('card_moved', moveData);
        this.io.to(`board:${boardId}`).emit('card_moved', moveData);

        // Create activity
        await this.createActivity(projectId, socket.userId, 'card_moved', {
          cardId,
          sourceListId,
          targetListId
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to move card' });
      }
    });

    // Card deleted
    socket.on('card_deleted', async (data) => {
      const { projectId, boardId, listId, cardId, cardTitle } = data;

      try {
        this.io.to(`project:${projectId}`).emit('card_deleted', {
          projectId,
          boardId,
          listId,
          cardId,
          deletedBy: {
            id: socket.userId,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          },
          timestamp: new Date()
        });

        // Create activity
        await this.createActivity(projectId, socket.userId, 'card_deleted', {
          cardTitle,
          listId,
          boardId
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to delete card' });
      }
    });

    // Comment added
    socket.on('comment_added', async (data) => {
      const { projectId, boardId, cardId, comment } = data;

      try {
        const commentData = {
          projectId,
          boardId,
          cardId,
          comment: {
            ...comment,
            author: {
              id: socket.userId,
              name: `${socket.user.firstName} ${socket.user.lastName}`,
              avatar: socket.user.avatar
            }
          },
          timestamp: new Date()
        };

        this.io.to(`project:${projectId}`).emit('comment_added', commentData);
        this.io.to(`board:${boardId}`).emit('comment_added', commentData);

        // Notify mentioned users
        if (comment.mentions && comment.mentions.length > 0) {
          comment.mentions.forEach(userId => {
            this.socketManager.notifyUser(userId, 'user_mentioned', {
              cardId,
              commentId: comment._id,
              mentionedBy: `${socket.user.firstName} ${socket.user.lastName}`,
              projectId
            });
          });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // User typing indicator
    socket.on('user_typing', (data) => {
      const { projectId, cardId, isTyping } = data;

      socket.to(`project:${projectId}`).emit('user_typing', {
        userId: socket.userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        cardId,
        isTyping,
        timestamp: new Date()
      });
    });
  }

  setupActivityEvents(socket) {
    // Get recent activities
    socket.on('get_activities', async (data) => {
      const { projectId, limit = 50, skip = 0 } = data;

      try {
        const activities = await Activity.find({ project: projectId })
          .populate('user', 'firstName lastName avatar')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);

        socket.emit('activities_loaded', {
          projectId,
          activities
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to load activities' });
      }
    });
  }

  // Helper method to create activity records
  async createActivity(projectId, userId, type, metadata = {}) {
    try {
      const activity = new Activity({
        type,
        description: this.getActivityDescription(type, metadata),
        user: userId,
        project: projectId,
        metadata
      });

      await activity.save();

      // Broadcast activity to project room
      const populatedActivity = await Activity.findById(activity._id)
        .populate('user', 'firstName lastName avatar');

      this.io.to(`project:${projectId}`).emit('activity_created', {
        projectId,
        activity: populatedActivity
      });

      return activity;
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  }

  getActivityDescription(type, metadata) {
    switch (type) {
      case 'member_added':
        return `added ${metadata.memberName} as ${metadata.role}`;
      case 'member_removed':
        return `removed ${metadata.memberName} from project`;
      case 'project_updated':
        return 'updated project details';
      case 'board_created':
        return `created board "${metadata.boardName}"`;
      case 'board_deleted':
        return `deleted board "${metadata.boardName}"`;
      case 'list_created':
        return `created list "${metadata.listName}"`;
      case 'card_created':
        return `created card "${metadata.cardTitle}"`;
      case 'card_moved':
        return `moved a card between lists`;
      case 'card_deleted':
        return `deleted card "${metadata.cardTitle}"`;
      default:
        return `performed ${type} action`;
    }
  }
}

module.exports = ProjectSocketManager;