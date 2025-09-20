const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketManager {
  constructor(server) {
    // Build allowed origins for Socket.IO
    const allowedOrigins = [
      'https://euroshub-alone.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    console.log('🔌 Socket.IO CORS origins:', allowedOrigins);
    console.log('🔌 Socket.IO Production mode:', process.env.NODE_ENV === 'production');

    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? ['https://euroshub-alone.vercel.app']
          : allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      transports: ['polling', 'websocket'], // Polling first for Railway compatibility
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      httpCompression: true,
      perMessageDeflate: true
    });

    // Add comprehensive Socket.IO debugging
    this.io.on('connection_error', (err) => {
      console.error('🚨 Socket.IO Connection Error:', err);
      console.error('🚨 Error Details:', {
        message: err.message,
        type: err.type,
        description: err.description,
        context: err.context,
        stack: err.stack
      });
    });

    this.io.engine.on('connection_error', (err) => {
      console.error('🚨 Socket.IO Engine Connection Error:', err);
      console.error('🚨 Engine Error Details:', {
        req: {
          url: err.req?.url,
          method: err.req?.method,
          headers: err.req?.headers
        },
        code: err.code,
        message: err.message,
        context: err.context
      });
    });

    console.log('🔌 Socket.IO server initialized with debugging');

    this.connectedUsers = new Map(); // userId -> socketId
    this.userRooms = new Map(); // userId -> Set of room names
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.firstName} ${socket.user.lastName} (${socket.user.role}) connected: ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      this.userRooms.set(socket.userId, new Set());

      // Join user to their role-based room
      socket.join(`role:${socket.user.role}`);
      
      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Notify about user online status
      this.broadcastUserStatus(socket.userId, 'online');

      // Handle project room joining
      socket.on('join-project', (projectId) => {
        this.joinProjectRoom(socket, projectId);
      });

      socket.on('leave-project', (projectId) => {
        this.leaveProjectRoom(socket, projectId);
      });

      // Handle real-time messaging
      socket.on('send-message', (data) => {
        this.handleMessage(socket, data);
      });

      // Handle task updates
      socket.on('task-update', (data) => {
        this.handleTaskUpdate(socket, data);
      });

      // Handle project updates
      socket.on('project-update', (data) => {
        this.handleProjectUpdate(socket, data);
      });

      // Handle user typing indicators
      socket.on('typing-start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing-stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Handle notifications
      socket.on('mark-notification-read', (notificationId) => {
        this.handleNotificationRead(socket, notificationId);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.firstName} ${socket.user.lastName} disconnected: ${socket.id}`);
        
        // Clean up user data
        this.connectedUsers.delete(socket.userId);
        this.userRooms.delete(socket.userId);
        
        // Notify about user offline status
        this.broadcastUserStatus(socket.userId, 'offline');
      });

      // Send initial connection success
      socket.emit('connected', {
        message: 'Connected to real-time server',
        userId: socket.userId,
        role: socket.user.role
      });
    });
  }

  joinProjectRoom(socket, projectId) {
    const roomName = `project:${projectId}`;
    socket.join(roomName);
    
    const userRooms = this.userRooms.get(socket.userId);
    if (userRooms) {
      userRooms.add(roomName);
    }

    // Notify others in the project about user joining
    socket.to(roomName).emit('user-joined-project', {
      userId: socket.userId,
      user: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role,
        avatar: socket.user.avatar
      },
      projectId
    });

    console.log(`User ${socket.user.firstName} joined project room: ${roomName}`);
  }

  leaveProjectRoom(socket, projectId) {
    const roomName = `project:${projectId}`;
    socket.leave(roomName);
    
    const userRooms = this.userRooms.get(socket.userId);
    if (userRooms) {
      userRooms.delete(roomName);
    }

    // Notify others in the project about user leaving
    socket.to(roomName).emit('user-left-project', {
      userId: socket.userId,
      projectId
    });

    console.log(`User ${socket.user.firstName} left project room: ${roomName}`);
  }

  handleMessage(socket, data) {
    const { projectId, message, type = 'text' } = data;
    
    const messageData = {
      id: Date.now().toString(),
      message,
      type,
      sender: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role,
        avatar: socket.user.avatar
      },
      timestamp: new Date(),
      projectId
    };

    // Broadcast to project room
    if (projectId) {
      this.io.to(`project:${projectId}`).emit('new-message', messageData);
    }
  }

  handleTaskUpdate(socket, data) {
    const { taskId, projectId, update, action } = data;
    
    const updateData = {
      taskId,
      projectId,
      update,
      action, // 'created', 'updated', 'deleted', 'status-changed', 'assigned'
      updatedBy: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role
      },
      timestamp: new Date()
    };

    // Broadcast to project room
    if (projectId) {
      socket.to(`project:${projectId}`).emit('task-updated', updateData);
    }

    // If task is assigned to someone, notify them directly
    if (action === 'assigned' && update.assignedTo) {
      this.notifyUser(update.assignedTo, 'task-assigned', {
        ...updateData,
        notification: {
          title: 'New Task Assigned',
          message: `You have been assigned a new task: ${update.title || 'Untitled Task'}`,
          type: 'task-assignment'
        }
      });
    }
  }

  handleProjectUpdate(socket, data) {
    const { projectId, update, action } = data;
    
    const updateData = {
      projectId,
      update,
      action, // 'created', 'updated', 'deleted', 'member-added', 'member-removed'
      updatedBy: {
        id: socket.user._id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role
      },
      timestamp: new Date()
    };

    // Broadcast to project room
    this.io.to(`project:${projectId}`).emit('project-updated', updateData);

    // If members are added, notify them
    if (action === 'member-added' && update.newMembers) {
      update.newMembers.forEach(memberId => {
        this.notifyUser(memberId, 'project-invitation', {
          ...updateData,
          notification: {
            title: 'Added to Project',
            message: `You have been added to project: ${update.name || 'Untitled Project'}`,
            type: 'project-invitation'
          }
        });
      });
    }
  }

  handleTypingStart(socket, data) {
    const { projectId } = data;
    
    if (projectId) {
      socket.to(`project:${projectId}`).emit('user-typing', {
        userId: socket.userId,
        user: {
          firstName: socket.user.firstName,
          lastName: socket.user.lastName
        },
        projectId
      });
    }
  }

  handleTypingStop(socket, data) {
    const { projectId } = data;
    
    if (projectId) {
      socket.to(`project:${projectId}`).emit('user-stopped-typing', {
        userId: socket.userId,
        projectId
      });
    }
  }

  handleNotificationRead(socket, notificationId) {
    // You can implement notification read status updates here
    // This would typically update the database and notify relevant parties
    console.log(`User ${socket.userId} marked notification ${notificationId} as read`);
  }

  broadcastUserStatus(userId, status) {
    this.io.emit('user-status-change', {
      userId,
      status, // 'online' or 'offline'
      timestamp: new Date()
    });
  }

  // Utility methods for sending notifications
  notifyUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  notifyRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  notifyProject(projectId, event, data) {
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Get online users
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Get users in a specific project
  getUsersInProject(projectId) {
    const room = this.io.sockets.adapter.rooms.get(`project:${projectId}`);
    return room ? Array.from(room) : [];
  }
}

module.exports = SocketManager;