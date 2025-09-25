'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  Archive,
  MoreVertical,
  Star,
  Lock,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Types for Board Management
export interface Board {
  _id: string;
  name: string;
  description: string;
  background: string;
  visibility: 'private' | 'team' | 'public';
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  members: Array<{
    userId: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: 'owner' | 'admin' | 'member' | 'viewer';
    joinedAt: Date;
  }>;
  listsCount?: number;
  cardsCount?: number;
  isStarred?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'superadmin' | 'admin' | 'client' | 'hr' | 'employee';

interface BoardManagementProps {
  userRole: UserRole;
  baseUrl: string;
}

interface BoardCardProps {
  board: Board;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onStar: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
}

// Board Card Component
const BoardCard: React.FC<BoardCardProps> = ({
  board,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onStar,
  canEdit,
  canDelete,
  canArchive,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getVisibilityIcon = () => {
    switch (board.visibility) {
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'team':
        return <Users className="w-4 h-4" />;
      case 'public':
        return <Globe className="w-4 h-4" />;
      default:
        return <Lock className="w-4 h-4" />;
    }
  };

  const getBackgroundStyle = () => {
    if (board.background?.startsWith('#')) {
      return { backgroundColor: board.background };
    } else if (board.background?.startsWith('http')) {
      return { backgroundImage: `url(${board.background})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return { backgroundColor: '#6366f1' }; // Default color
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 group">
      {/* Board Preview/Background */}
      <div
        className="h-32 rounded-t-lg relative cursor-pointer"
        style={getBackgroundStyle()}
        onClick={() => onView(board._id)}
      >
        <div className="absolute inset-0 bg-black bg-opacity-20 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar(board._id);
          }}
          className="absolute top-2 left-2 p-1 rounded bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
        >
          <Star className={`w-4 h-4 ${board.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
        </button>

        {/* Menu Button */}
        {(canEdit || canDelete || canArchive) && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-32">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(board._id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(board._id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {canArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(board._id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(board._id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Board Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3
            className="font-semibold text-gray-900 dark:text-white text-lg cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={() => onView(board._id)}
          >
            {board.name}
          </h3>
          <div className="flex items-center gap-1">
            {getVisibilityIcon()}
          </div>
        </div>

        {board.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {board.description}
          </p>
        )}

        {/* Board Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{board.listsCount || 0} lists</span>
            <span>{board.cardsCount || 0} cards</span>
          </div>

          {/* Members avatars */}
          <div className="flex -space-x-2">
            {board.members?.slice(0, 3).map((member, index) => (
              <div
                key={member.userId._id}
                className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium"
                title={`${member.userId.firstName} ${member.userId.lastName}`}
              >
                {member.userId.avatar ? (
                  <img
                    src={member.userId.avatar}
                    alt={`${member.userId.firstName} ${member.userId.lastName}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">
                    {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                  </span>
                )}
              </div>
            ))}
            {board.members && board.members.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white">
                +{board.members.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Board Management Component
const BoardManagement: React.FC<BoardManagementProps> = ({ userRole, baseUrl }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Permission checks based on role
  const canCreateBoards = ['superadmin', 'admin', 'hr', 'employee'].includes(userRole);
  const canEditAllBoards = ['superadmin', 'admin'].includes(userRole);
  const canDeleteAllBoards = ['superadmin', 'admin'].includes(userRole);

  // Load boards
  useEffect(() => {
    loadBoards();
  }, [userRole]);

  const loadBoards = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      const mockBoards: Board[] = [
        {
          _id: '1',
          name: 'Marketing Campaign Q4',
          description: 'Planning and execution of Q4 marketing campaigns',
          background: '#6366f1',
          visibility: 'team',
          createdBy: {
            _id: '1',
            firstName: 'John',
            lastName: 'Doe'
          },
          members: [
            {
              userId: {
                _id: '1',
                firstName: 'John',
                lastName: 'Doe'
              },
              role: 'owner',
              joinedAt: new Date()
            }
          ],
          listsCount: 4,
          cardsCount: 12,
          isStarred: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: '2',
          name: 'Product Development',
          description: 'Track product features and development milestones',
          background: '#10b981',
          visibility: 'private',
          createdBy: {
            _id: '2',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          members: [
            {
              userId: {
                _id: '2',
                firstName: 'Jane',
                lastName: 'Smith'
              },
              role: 'owner',
              joinedAt: new Date()
            }
          ],
          listsCount: 6,
          cardsCount: 18,
          isStarred: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      setBoards(mockBoards);
    } catch (err) {
      console.error('Error loading boards:', err);
      setError('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  // Filter boards based on search term
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Board actions
  const handleViewBoard = (boardId: string) => {
    router.push(`${baseUrl}/boards/${boardId}`);
  };

  const handleEditBoard = (boardId: string) => {
    // TODO: Open edit board modal
    console.log('Edit board:', boardId);
  };

  const handleDeleteBoard = (boardId: string) => {
    // TODO: Open delete confirmation modal
    console.log('Delete board:', boardId);
  };

  const handleArchiveBoard = (boardId: string) => {
    // TODO: Archive board
    console.log('Archive board:', boardId);
  };

  const handleStarBoard = (boardId: string) => {
    // TODO: Toggle star status
    setBoards(prev => prev.map(board =>
      board._id === boardId
        ? { ...board, isStarred: !board.isStarred }
        : board
    ));
  };

  const handleCreateBoard = () => {
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Boards</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Organize your work with flexible boards
          </p>
        </div>

        {canCreateBoards && (
          <button
            onClick={handleCreateBoard}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Board
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search boards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              viewMode === 'grid'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Boards Display */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Grid3X3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No boards found' : 'No boards yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'Create your first board to get started organizing your work'
            }
          </p>
          {canCreateBoards && !searchTerm && (
            <button
              onClick={handleCreateBoard}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Board
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
        }>
          {filteredBoards.map((board) => (
            <BoardCard
              key={board._id}
              board={board}
              onView={handleViewBoard}
              onEdit={handleEditBoard}
              onDelete={handleDeleteBoard}
              onArchive={handleArchiveBoard}
              onStar={handleStarBoard}
              canEdit={canEditAllBoards || board.createdBy._id === user?.id}
              canDelete={canDeleteAllBoards || board.createdBy._id === user?.id}
              canArchive={canEditAllBoards || board.createdBy._id === user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardManagement;