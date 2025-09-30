'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  Star,
  Plus,
  Home,
  Grid3X3
} from 'lucide-react';
import { boardsApi } from '@/services/trelloBoardsApi';

interface BoardMember {
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  role: 'owner' | 'admin' | 'viewer' | 'member';
  joinedAt: Date;
}

interface Board {
  _id: string;
  name: string;
  background: string;
  isStarred: boolean;
  members: BoardMember[];
  visibility: 'private' | 'team' | 'public';
}

interface BoardSwitcherDockProps {
  currentBoardId: string;
  baseUrl: string;
}

const BoardSwitcherDock: React.FC<BoardSwitcherDockProps> = ({
  currentBoardId,
  baseUrl
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBoards = useCallback(async () => {
    try {
      const allBoards = await boardsApi.getBoards();
      // Filter out current board and show only first 6 boards
      const otherBoards = allBoards
        .filter(board => board._id !== currentBoardId)
        .slice(0, 6);
      setBoards(otherBoards);
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBoardId]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const generateBoardIcon = (board: Board) => {
    const bgStyle = board.background?.startsWith('#')
      ? { backgroundColor: board.background }
      : board.background?.startsWith('http')
      ? {
          backgroundImage: `url(${board.background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      : { backgroundColor: '#6366f1' };

    return (
      <div className="relative w-full h-full">
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white/30 shadow-lg transition-all duration-200 hover:border-white/50"
          style={bgStyle}
        >
          {board.background?.startsWith('http') ? (
            <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
              {board.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            board.name.charAt(0).toUpperCase()
          )}
        </div>
        {/* Star indicator for starred boards */}
        {board.isStarred && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-yellow-900 fill-yellow-900" />
          </div>
        )}
        {/* Member count indicator */}
        {board.members.length > 1 && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {board.members.length > 9 ? '9+' : board.members.length}
            </span>
          </div>
        )}
      </div>
    );
  };

  const dockItems = [
    // Home/Dashboard
    {
      title: "Dashboard",
      icon: <Home className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: baseUrl,
    },
    // All Boards
    {
      title: "All Boards",
      icon: <Grid3X3 className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: `${baseUrl}/boards`,
    },
    // Recent Boards
    ...boards.map(board => ({
      title: board.name,
      icon: generateBoardIcon(board),
      href: `${baseUrl}/boards/${board._id}`,
    })),
    // Starred boards indicator (if any starred boards exist)
    ...(boards.some(b => b.isStarred) ? [{
      title: "Starred Boards",
      icon: <Star className="h-full w-full text-yellow-500" />,
      href: `${baseUrl}/boards?starred=true`,
    }] : []),
    // Create new board
    {
      title: "Create Board",
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-white" />
          </div>
        </div>
      ),
      href: `${baseUrl}/boards?create=true`,
    },
  ];

  if (loading) {
    return null; // Don't show dock while loading
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <FloatingDock
        items={dockItems}
        desktopClassName="backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-white/20 dark:border-gray-700/50 shadow-2xl"
        mobileClassName="backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-white/20 dark:border-gray-700/50 shadow-2xl"
      />
    </div>
  );
};

export default BoardSwitcherDock;