// Example Socket.IO client implementation for your Next.js frontend
// Place this in your frontend project (e.g., utils/socket.js)

import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Authentication events
    this.socket.on('connected', (data) => {
      console.log('Socket authenticated successfully:', data);
    });

    // Real-time notifications
    this.socket.on('account-created', (data) => {
      this.showNotification('success', 'Account Created', data.message);
    });

    this.socket.on('password-changed', (data) => {
      this.showNotification('info', 'Security Update', data.message);
    });

    this.socket.on('user-created', (data) => {
      this.showNotification('info', 'New User Created', 
        `${data.user.firstName} ${data.user.lastName} (${data.user.role}) has been created`);
    });

    // Project events
    this.socket.on('project-created', (data) => {
      this.showNotification('success', 'New Project', 
        `Project "${data.project.name}" has been created`);
    });

    this.socket.on('user-joined-project', (data) => {
      this.showNotification('info', 'Project Update', 
        `${data.user.firstName} ${data.user.lastName} joined the project`);
    });

    this.socket.on('user-left-project', (data) => {
      this.showNotification('info', 'Project Update', 
        `User left the project`);
    });

    // Task events
    this.socket.on('task-assigned', (data) => {
      this.showNotification('info', 'Task Assigned', 
        `You have been assigned: ${data.task.title}`);
    });

    this.socket.on('task-updated', (data) => {
      this.showNotification('info', 'Task Update', 
        `Task "${data.update.title || 'Untitled'}" has been ${data.action}`);
    });

    this.socket.on('task-status-changed', (data) => {
      this.showNotification('info', 'Task Status Update', 
        `Task "${data.task.title}" status changed from ${data.task.oldStatus} to ${data.task.newStatus}`);
    });

    // Chat events
    this.socket.on('new-message', (data) => {
      // Handle new chat messages
      this.handleNewMessage(data);
    });

    this.socket.on('direct-message', (data) => {
      this.showNotification('info', 'New Message', 
        `Message from ${data.from.firstName} ${data.from.lastName}`);
    });

    this.socket.on('user-typing', (data) => {
      this.handleUserTyping(data);
    });

    this.socket.on('user-stopped-typing', (data) => {
      this.handleUserStoppedTyping(data);
    });

    // Status events
    this.socket.on('user-status-change', (data) => {
      this.handleUserStatusChange(data);
    });

    // System events
    this.socket.on('system-maintenance', (data) => {
      this.showNotification('warning', 'System Maintenance', data.message);
    });

    this.socket.on('announcement', (data) => {
      this.showNotification('info', data.announcement.title, data.announcement.content);
    });

    // File sharing
    this.socket.on('file-shared', (data) => {
      this.showNotification('info', 'File Shared', 
        `${data.sharedBy.firstName} shared "${data.file.name}"`);
    });

    // Deadlines
    this.socket.on('deadline-approaching', (data) => {
      const urgencyColor = data.urgency === 'critical' ? 'error' : 
                           data.urgency === 'high' ? 'warning' : 'info';
      this.showNotification(urgencyColor, 'Deadline Approaching', 
        `Task "${data.task.title}" is due in ${data.daysRemaining} day(s)`);
    });
  }

  // Project room management
  joinProject(projectId) {
    if (this.socket?.connected) {
      this.socket.emit('join-project', projectId);
    }
  }

  leaveProject(projectId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-project', projectId);
    }
  }

  // Messaging
  sendMessage(projectId, message, type = 'text') {
    if (this.socket?.connected) {
      this.socket.emit('send-message', { projectId, message, type });
    }
  }

  // Typing indicators
  startTyping(projectId) {
    if (this.socket?.connected) {
      this.socket.emit('typing-start', { projectId });
    }
  }

  stopTyping(projectId) {
    if (this.socket?.connected) {
      this.socket.emit('typing-stop', { projectId });
    }
  }

  // Task updates
  updateTask(taskId, projectId, update, action) {
    if (this.socket?.connected) {
      this.socket.emit('task-update', { taskId, projectId, update, action });
    }
  }

  // Project updates
  updateProject(projectId, update, action) {
    if (this.socket?.connected) {
      this.socket.emit('project-update', { projectId, update, action });
    }
  }

  // Notifications
  markNotificationRead(notificationId) {
    if (this.socket?.connected) {
      this.socket.emit('mark-notification-read', notificationId);
    }
  }

  // Event handlers (to be implemented in your React components)
  handleNewMessage(data) {
    // Implement message handling logic
    // Update chat UI, play notification sound, etc.
    console.log('New message:', data);
  }

  handleUserTyping(data) {
    // Show typing indicator
    console.log(`${data.user.firstName} is typing...`);
  }

  handleUserStoppedTyping(data) {
    // Hide typing indicator
    console.log(`${data.userId} stopped typing`);
  }

  handleUserStatusChange(data) {
    // Update user online/offline status in UI
    console.log(`User ${data.userId} is now ${data.status}`);
  }

  showNotification(type, title, message) {
    // Implement your notification system here
    // Could use toast notifications, browser notifications, etc.
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // Example using browser notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Custom event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}

// Singleton instance
const socketClient = new SocketClient();

export default socketClient;

// React hook for using socket in components
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socketClient.isConnected);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);

    return () => {
      socketClient.off('connect', handleConnect);
      socketClient.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    socket: socketClient,
    isConnected,
    joinProject: socketClient.joinProject.bind(socketClient),
    leaveProject: socketClient.leaveProject.bind(socketClient),
    sendMessage: socketClient.sendMessage.bind(socketClient),
    updateTask: socketClient.updateTask.bind(socketClient),
    updateProject: socketClient.updateProject.bind(socketClient)
  };
};