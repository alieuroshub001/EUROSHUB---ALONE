'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  Star,
  Plus,
  Home,
  Grid3X3,
  Settings,
  X,
  Check,
  GripVertical
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
  userRole: string;
}

const BoardSwitcherDock: React.FC<BoardSwitcherDockProps> = ({
  currentBoardId,
  baseUrl,
  userRole
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [availableBoards, setAvailableBoards] = useState<Board[]>([]);

  // Role-based permissions
  const canCreateBoards = ['superadmin', 'admin', 'hr'].includes(userRole);

  const loadBoards = useCallback(async () => {
    try {
      const allBoards = await boardsApi.getBoards();
      const otherBoards = allBoards.filter(board => board._id !== currentBoardId);
      setAvailableBoards(otherBoards);

      // Load saved selection from localStorage or use default (first 5 for customizable slots)
      const savedSelection = localStorage.getItem('dockBoardIds');
      if (savedSelection) {
        const savedIds = JSON.parse(savedSelection);
        const selectedBoards = otherBoards.filter(board => savedIds.includes(board._id)).slice(0, 5);
        setBoards(selectedBoards);
        setSelectedBoardIds(savedIds.slice(0, 5));
      } else {
        const defaultBoards = otherBoards.slice(0, 5);
        setBoards(defaultBoards);
        setSelectedBoardIds(defaultBoards.map(b => b._id));
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBoardId]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleSaveCustomization = () => {
    const selectedBoards = availableBoards.filter(board =>
      selectedBoardIds.includes(board._id)
    );
    setBoards(selectedBoards);
    localStorage.setItem('dockBoardIds', JSON.stringify(selectedBoardIds));
    setShowCustomizeModal(false);
  };

  const toggleBoardSelection = (boardId: string) => {
    setSelectedBoardIds(prev => {
      if (prev.includes(boardId)) {
        return prev.filter(id => id !== boardId);
      } else {
        // Limit to 5 boards
        if (prev.length >= 5) {
          return prev;
        }
        return [...prev, boardId];
      }
    });
  };

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
          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold text-xs border-2 border-white/20 shadow-md transition-all duration-200 hover:border-white/40 hover:shadow-lg"
          style={bgStyle}
        >
          {board.background?.startsWith('http') ? (
            <div className="w-full h-full rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
              {board.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            board.name.charAt(0).toUpperCase()
          )}
        </div>
        {/* Star indicator */}
        {board.isStarred && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
            <Star className="w-2 h-2 text-yellow-900 fill-yellow-900" />
          </div>
        )}
      </div>
    );
  };

  const dockItems = [
    // Fixed: Home/Dashboard
    {
      title: "Dashboard",
      icon: <Home className="h-full w-full text-gray-600 dark:text-gray-400" />,
      href: baseUrl,
    },
    // Fixed: All Boards
    {
      title: "All Boards",
      icon: <Grid3X3 className="h-full w-full text-gray-600 dark:text-gray-400" />,
      href: `${baseUrl}/boards`,
    },
    // Customizable: User-selected boards (up to 5)
    ...boards.map(board => ({
      title: board.name,
      icon: generateBoardIcon(board),
      href: `${baseUrl}/boards/${board._id}`,
    })),
    // Fixed: Starred boards
    {
      title: "Starred Boards",
      icon: <Star className="h-full w-full text-yellow-500 fill-yellow-500" />,
      href: `${baseUrl}/boards?starred=true`,
    },
    // Fixed: Create new board (only for superadmin, admin, hr)
    ...(canCreateBoards ? [{
      title: "Create Board",
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
            <Plus className="w-5 h-5 text-white dark:text-gray-900" />
          </div>
        </div>
      ),
      href: `${baseUrl}/boards?create=true`,
    }] : []),
  ];

  if (loading) {
    return null; // Don't show dock while loading
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <FloatingDock
          items={dockItems}
          desktopClassName="backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 shadow-xl"
          mobileClassName="backdrop-blur-2xl bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 shadow-xl"
        />
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowCustomizeModal(true)}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl bg-white dark:bg-gray-900 backdrop-blur-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
        title="Customize Dock"
      >
        <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Customization Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Customize Dock
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select boards to display in your dock
                </p>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-2">
                {availableBoards.map((board) => (
                  <div
                    key={board._id}
                    onClick={() => toggleBoardSelection(board._id)}
                    className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedBoardIds.includes(board._id)
                        ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Board Icon */}
                    <div className="w-10 h-10 flex-shrink-0">
                      {generateBoardIcon(board)}
                    </div>

                    {/* Board Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {board.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {board.isStarred && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {board.members.length} {board.members.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedBoardIds.includes(board._id)
                          ? 'bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedBoardIds.includes(board._id) && (
                        <Check className="w-3 h-3 text-white dark:text-gray-900" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {availableBoards.length === 0 && (
                <div className="text-center py-12">
                  <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No other boards available
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedBoardIds.length} of 5 boards selected
                </span>
                {selectedBoardIds.length >= 5 && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-500">
                    Maximum limit reached
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCustomizeModal(false)}
                  className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-5 py-2 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-lg transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BoardSwitcherDock;