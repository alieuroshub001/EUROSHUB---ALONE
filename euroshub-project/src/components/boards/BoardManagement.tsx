'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Users,
  Eye,
  Edit,
  Trash2,
  Archive,
  MoreVertical,
  Star,
  Lock,
  Globe,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { boardsApi } from '@/services/trelloBoardsApi';

// Types for Board Management
export interface Board {
  _id: string;
  name: string;
  description?: string;
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

// Create Board Modal Component
interface CreateBoardModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    background?: string;
  }) => Promise<void> | void;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    background: '#6366f1'
  });
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, background: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let backgroundUrl = formData.background;

      // If user selected image and uploaded a file
      if (backgroundType === 'image' && imageFile) {
        try {
          const uploadResult = await boardsApi.uploadBackground(imageFile);
          backgroundUrl = uploadResult.url;
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Failed to upload image. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      await onSubmit({
        name: formData.name.trim(),
        description: formData.description || undefined,
        background: backgroundUrl
      });
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backgroundOptions = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Create New Board
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Board Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter board name..."
                autoFocus
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="What's this board about..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Board Background
              </label>

              {/* Background Type Selector */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setBackgroundType('color')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    backgroundType === 'color'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Color
                </button>
                <button
                  type="button"
                  onClick={() => setBackgroundType('image')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    backgroundType === 'image'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Image
                </button>
              </div>

              {backgroundType === 'color' ? (
                <div className="flex gap-2 flex-wrap">
                  {backgroundOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, background: color }));
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className={`w-10 h-10 rounded-md border-2 transition-all ${
                        formData.background === color && backgroundType === 'color'
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  {imagePreview && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Background preview"
                        className="w-full h-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                          setFormData(prev => ({ ...prev, background: '#6366f1' }));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>


            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center space-x-2"
              >
                {isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isSubmitting ? 'Creating...' : 'Create Board'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!showMenu && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 128 // 128px = min-w-32 * 4
      });
    }

    setShowMenu(!showMenu);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

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
    if (!board.background) {
      return { backgroundColor: '#6366f1' }; // Default color
    }

    if (board.background.startsWith('#')) {
      return { backgroundColor: board.background };
    } else if (board.background.startsWith('http')) {
      return {
        backgroundImage: `url(${board.background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }

    // Fallback for any other format
    return { backgroundColor: '#6366f1' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group overflow-visible">
      {/* Board Preview/Background */}
      <div
        className="h-24 relative cursor-pointer overflow-hidden"
        style={getBackgroundStyle()}
        onClick={() => onView(board._id)}
      >
        {/* Board name overlay on image */}
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="font-bold text-white text-sm line-clamp-1" style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.6)'
          }}>
            {board.name}
          </h3>
        </div>

        {/* Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar(board._id);
          }}
          className="absolute top-2 left-2 p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all duration-200"
        >
          <Star className={`w-3.5 h-3.5 ${board.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
        </button>

        {/* Menu Button */}
        {(canEdit || canDelete || canArchive) && (
          <div className="absolute top-2 right-2">
            <button
              ref={setButtonRef}
              onClick={handleMenuToggle}
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-3.5 h-3.5 text-white" />
            </button>

          </div>
        )}
      </div>

      {/* Compact Board Info */}
      <div className="p-3">
        {/* Top row: Title and Visibility */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            {board.description && (
              <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 line-clamp-1">
                {board.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 text-gray-400">
            {getVisibilityIcon()}
          </div>
        </div>

        {/* Bottom row: Stats and Members */}
        <div className="flex items-center justify-between">
          {/* Stats with better visual separation */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>{board.listsCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{board.cardsCount || 0}</span>
            </div>
          </div>

          {/* Members avatars - smaller and more elegant */}
          <div className="flex -space-x-1.5">
            {board.members?.slice(0, 2).map((member, index) => (
              <div
                key={member.userId?._id || `member-${index}`}
                className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center"
                title={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
              >
                {member.userId?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.userId.avatar}
                    alt={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 dark:text-gray-300 text-[10px] font-medium">
                    {member.userId?.firstName?.charAt(0) || '?'}{member.userId?.lastName?.charAt(0) || '?'}
                  </span>
                )}
              </div>
            ))}
            {board.members && board.members.length > 2 && (
              <div className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <span className="text-white text-[10px] font-medium">+{board.members.length - 2}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portal-based Dropdown Menu */}
      {showMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-32"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>,
        document.body
      )}
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
  const [filterType, setFilterType] = useState<'all' | 'created' | 'member'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'name'>('latest');

  // Permission checks based on role
  const canCreateBoards = ['superadmin', 'admin', 'hr', 'employee'].includes(userRole);
  const canEditAllBoards = ['superadmin', 'admin'].includes(userRole);
  const canDeleteAllBoards = ['superadmin', 'admin'].includes(userRole);

  // Load boards
  useEffect(() => {
    loadBoards();
  }, [userRole]);

  // Check for URL parameters to open create modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('create') === 'true' && canCreateBoards) {
        setShowCreateModal(true);
        // Clean the URL without page refresh
        const newUrl = window.location.pathname + (urlParams.get('starred') ? '?starred=true' : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [canCreateBoards]);

  const loadBoards = async () => {
    try {
      setLoading(true);
      setError(null);

      const boardsData = await boardsApi.getBoards();
      setBoards(boardsData);
    } catch (err) {
      console.error('Error loading boards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  // Filter boards based on search term and filters
  const filteredBoards = boards
    .filter(board => {
      // Search filter
      const matchesSearch = !searchTerm ||
        board.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        board.description?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Type filter
      switch (filterType) {
        case 'created':
          return board.createdBy._id === user?.id;
        case 'member':
          return board.createdBy._id !== user?.id &&
                 board.members?.some(member => member.userId._id === user?.id);
        case 'all':
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Sort logic
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'latest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Board actions
  const handleViewBoard = (boardId: string) => {
    router.push(`${baseUrl}/boards/${boardId}`);
  };

  const handleEditBoard = (boardId: string) => {
    // TODO: Open edit board modal
    console.log('Edit board:', boardId);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      await boardsApi.deleteBoard(boardId);
      setBoards(prev => prev.filter(board => board._id !== boardId));
    } catch (err) {
      console.error('Error deleting board:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete board');
    }
  };

  const handleArchiveBoard = (boardId: string) => {
    // TODO: Archive board (not implemented in API yet)
    console.log('Archive board:', boardId);
  };

  const handleStarBoard = async (boardId: string) => {
    try {
      const result = await boardsApi.toggleStar(boardId);
      setBoards(prev => prev.map(board =>
        board._id === boardId
          ? { ...board, isStarred: result.isStarred }
          : board
      ));
    } catch (err) {
      console.error('Error toggling star:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle star');
    }
  };

  const handleCreateBoard = () => {
    setShowCreateModal(true);
  };

  const handleCreateBoardSubmit = async (boardData: {
    name: string;
    description?: string;
    background?: string;
  }) => {
    try {
      const newBoard = await boardsApi.createBoard({
        ...boardData,
        visibility: 'private', // Always create boards as private
        createDefaultLists: true,
      });
      setBoards(prev => [newBoard, ...prev]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating board:', err);
      setError(err instanceof Error ? err.message : 'Failed to create board');
    }
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
      <div className="space-y-4">
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

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'created' | 'member')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All boards</option>
              <option value="created">Created by me</option>
              <option value="member">Added to by others</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest' | 'name')}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {filteredBoards.length} {filteredBoards.length === 1 ? 'board' : 'boards'}
          </div>
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
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
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

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBoardSubmit}
        />
      )}
    </div>
  );
};

export default BoardManagement;