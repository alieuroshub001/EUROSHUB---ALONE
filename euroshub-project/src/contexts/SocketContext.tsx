'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import Cookies from 'js-cookie';

interface SocketContextType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
  isConnected: boolean;
  error: string | null;
  onlineUsers: string[];
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Export the context for direct use
export { SocketContext };

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const token = Cookies.get('token');


  const {
    socket,
    isConnected,
    error,
    on,
    off,
    joinProject,
    leaveProject,
    joinBoard,
    leaveBoard,
    disconnect
  } = useSocket({
    token,
    autoConnect: !!token // Only connect if token exists
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for user status changes
    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
    };

    const handleUserStatusChange = (data: { userId: string; status?: string }) => {
      if (data.status === 'online') {
        setOnlineUsers(prev => [...new Set([...prev, data.userId])]);
      } else if (data.status === 'offline') {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      }
    };

    on('user_online', handleUserOnline);
    on('user_offline', handleUserOffline);
    on('user_status_change', handleUserStatusChange);

    return () => {
      off('user_online', handleUserOnline);
      off('user_offline', handleUserOffline);
      off('user_status_change', handleUserStatusChange);
    };
  }, [socket, isConnected, on, off]);

  const value: SocketContextType = {
    socket,
    isConnected,
    error,
    onlineUsers,
    joinProject,
    leaveProject,
    joinBoard,
    leaveBoard,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};