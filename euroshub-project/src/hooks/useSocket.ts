'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  url?: string;
  token?: string;
  autoConnect?: boolean;
}

interface SocketEvents {
  // Project events
  project_updated: (data: any) => void;
  project_member_added: (data: any) => void;
  project_member_removed: (data: any) => void;

  // Board events
  board_created: (data: any) => void;
  board_updated: (data: any) => void;
  board_deleted: (data: any) => void;

  // List events
  list_created: (data: any) => void;
  list_updated: (data: any) => void;
  list_deleted: (data: any) => void;

  // Card events
  card_created: (data: any) => void;
  card_updated: (data: any) => void;
  card_deleted: (data: any) => void;
  card_moved: (data: any) => void;
  card_assigned: (data: any) => void;

  // Comment events
  comment_added: (data: any) => void;
  comment_updated: (data: any) => void;
  comment_deleted: (data: any) => void;

  // Activity events
  activity_created: (data: any) => void;

  // User events
  user_online: (data: any) => void;
  user_offline: (data: any) => void;
  user_typing: (data: any) => void;
  user_status_change: (data: any) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
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

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = <T extends keyof SocketEvents>(event: T, handler: SocketEvents[T]) => {
    if (socketRef.current) {
      socketRef.current.on(event as string, handler as (...args: any[]) => void);
    }
  };

  const off = <T extends keyof SocketEvents>(event: T, handler?: SocketEvents[T]) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event as string, handler as (...args: any[]) => void);
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
    leaveBoard
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
      socket.on('user_online', (data) => {
        setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
      });

      socket.on('user_offline', (data) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      });

      return () => {
        socket.leaveProject(projectId);
        socket.off('user_online');
        socket.off('user_offline');
      };
    }
  }, [socket.isConnected, projectId]);

  const updateCardPosition = (cardId: string, sourceListId: string, targetListId: string, position: number) => {
    socket.emit('card_moved', {
      projectId,
      cardId,
      sourceListId,
      targetListId,
      position
    });
  };

  const updateCardInRealTime = (cardId: string, updates: any) => {
    socket.emit('card_updated', {
      projectId,
      cardId,
      updates
    });
  };

  const addCommentInRealTime = (cardId: string, comment: any) => {
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