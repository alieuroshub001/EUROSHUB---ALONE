'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  url?: string;
  token?: string;
  autoConnect?: boolean;
}

// Define specific types for socket events
interface ProjectUpdatedData {
  projectId: string;
  updates: Record<string, unknown>;
}

interface ProjectMemberData {
  projectId: string;
  userId: string;
  memberDetails?: Record<string, unknown>;
}

interface BoardData {
  boardId: string;
  projectId: string;
  [key: string]: unknown;
}

interface ListData {
  listId: string;
  boardId: string;
  [key: string]: unknown;
}

interface CardData {
  cardId: string;
  listId: string;
  [key: string]: unknown;
}

interface CardMovedData {
  cardId: string;
  sourceListId: string;
  targetListId: string;
  position: number;
  projectId?: string;
}

interface CardAssignedData {
  cardId: string;
  userId: string;
  projectId?: string;
}

interface CommentData {
  commentId: string;
  cardId: string;
  content: string;
  userId: string;
  [key: string]: unknown;
}

interface ActivityData {
  activityId: string;
  type: string;
  [key: string]: unknown;
}

interface UserPresenceData {
  userId: string;
  status?: string;
}

interface UserTypingData {
  userId: string;
  cardId: string;
  isTyping: boolean;
}

interface SocketEvents {
  // Project events
  project_updated: (data: ProjectUpdatedData) => void;
  project_member_added: (data: ProjectMemberData) => void;
  project_member_removed: (data: ProjectMemberData) => void;

  // Board events
  board_created: (data: BoardData) => void;
  board_updated: (data: BoardData) => void;
  board_deleted: (data: BoardData) => void;

  // List events
  list_created: (data: ListData) => void;
  list_updated: (data: ListData) => void;
  list_deleted: (data: ListData) => void;

  // Card events
  card_created: (data: CardData) => void;
  card_updated: (data: CardData) => void;
  card_deleted: (data: CardData) => void;
  card_moved: (data: CardMovedData) => void;
  card_assigned: (data: CardAssignedData) => void;

  // Comment events
  comment_added: (data: CommentData) => void;
  comment_updated: (data: CommentData) => void;
  comment_deleted: (data: CommentData) => void;

  // Activity events
  activity_created: (data: ActivityData) => void;

  // User events
  user_online: (data: UserPresenceData) => void;
  user_offline: (data: UserPresenceData) => void;
  user_typing: (data: UserTypingData) => void;
  user_status_change: (data: UserPresenceData) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001',
    token,
    autoConnect = true
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) {
      return;
    }
    const socket = io(url, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      setError(err.message);
      console.error('Socket connection error:', err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [url, token, autoConnect]);

  const emit = (event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = <T extends keyof SocketEvents>(event: T, handler: SocketEvents[T]) => {
    if (socketRef.current) {
      socketRef.current.on(event as string, handler as (...args: unknown[]) => void);
    }
  };

  const off = <T extends keyof SocketEvents>(event: T, handler?: SocketEvents[T]) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event as string, handler as (...args: unknown[]) => void);
      } else {
        socketRef.current.off(event as string);
      }
    }
  };

  const joinRoom = (room: string) => {
    emit('join_room', { room });
  };

  const leaveRoom = (room: string) => {
    emit('leave_room', { room });
  };

  const joinProject = (projectId: string) => {
    joinRoom(`project:${projectId}`);
  };

  const leaveProject = (projectId: string) => {
    leaveRoom(`project:${projectId}`);
  };

  const joinBoard = (boardId: string) => {
    joinRoom(`board:${boardId}`);
  };

  const leaveBoard = (boardId: string) => {
    leaveRoom(`board:${boardId}`);
  };

  const joinCard = (cardId: string) => {
    emit('join-card', cardId);
  };

  const leaveCard = (cardId: string) => {
    emit('leave-card', cardId);
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    joinProject,
    leaveProject,
    joinBoard,
    leaveBoard,
    joinCard,
    leaveCard,
    disconnect
  };
};

// Hook for project-specific real-time updates
export const useProjectSocket = (projectId: string, token?: string) => {
  const socket = useSocket({ token });
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (socket.isConnected && projectId) {
      socket.joinProject(projectId);

      // Listen for user presence updates
      const handleUserOnline = (data: UserPresenceData) => {
        setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
      };

      const handleUserOffline = (data: UserPresenceData) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      };

      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);

      return () => {
        socket.leaveProject(projectId);
        socket.off('user_online', handleUserOnline);
        socket.off('user_offline', handleUserOffline);
      };
    }
  }, [socket, projectId]);

  const updateCardPosition = (cardId: string, sourceListId: string, targetListId: string, position: number) => {
    socket.emit('card_moved', {
      projectId,
      cardId,
      sourceListId,
      targetListId,
      position
    });
  };

  const updateCardInRealTime = (cardId: string, updates: Record<string, unknown>) => {
    socket.emit('card_updated', {
      projectId,
      cardId,
      updates
    });
  };

  const addCommentInRealTime = (cardId: string, comment: Record<string, unknown>) => {
    socket.emit('comment_added', {
      projectId,
      cardId,
      comment
    });
  };

  const notifyTyping = (cardId: string, isTyping: boolean) => {
    socket.emit('user_typing', {
      projectId,
      cardId,
      isTyping
    });
  };

  return {
    ...socket,
    onlineUsers,
    updateCardPosition,
    updateCardInRealTime,
    addCommentInRealTime,
    notifyTyping
  };
};