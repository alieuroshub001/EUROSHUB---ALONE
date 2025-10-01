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
}

const BoardSwitcherDock: React.FC<BoardSwitcherDockProps> = ({
  currentBoardId,
  baseUrl
}) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [availableBoards, setAvailableBoards] = useState<Board[]>([]);

  const loadBoards = useCallback(async () => {
    try {
      const allBoards = await boardsApi.getBoards();
      const otherBoards = allBoards.filter(board => board._id !== currentBoardId);
      setAvailableBoards(otherBoards);

      // Load saved selection from localStorage or use default (first 6)
      const savedSelection = localStorage.getItem('dockBoardIds');
      if (savedSelection) {
        const savedIds = JSON.parse(savedSelection);
        const selectedBoards = otherBoards.filter(board => savedIds.includes(board._id));
        setBoards(selectedBoards);
        setSelectedBoardIds(savedIds);
      } else {
        const defaultBoards = otherBoards.slice(0, 6);
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
    setSelectedBoardIds(prev =>
      prev.includes(boardId)
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
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
    // Custom selected boards
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
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <FloatingDock
          items={dockItems}
          desktopClassName="backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-white/20 dark:border-gray-700/50 shadow-2xl"
          mobileClassName="backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-white/20 dark:border-gray-700/50 shadow-2xl"
        />
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowCustomizeModal(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl flex items-center justify-center shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:scale-110 hover:shadow-xl transition-all duration-300"
        title="Customize Dock"
      >
        <Settings className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Customization Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Customize Dock
              </h2>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select boards to display in your dock. You can choose multiple boards.
              </p>

              <div className="space-y-2">
                {availableBoards.map((board) => (
                  <div
                    key={board._id}
                    onClick={() => toggleBoardSelection(board._id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedBoardIds.includes(board._id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Board Icon */}
                    <div className="w-12 h-12 flex-shrink-0">
                      {generateBoardIcon(board)}
                    </div>

                    {/* Board Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {board.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
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
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedBoardIds.includes(board._id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedBoardIds.includes(board._id) && (
                        <Check className="w-4 h-4 text-white" />
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
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedBoardIds.length} board{selectedBoardIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCustomizeModal(false)}
                  className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg"
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