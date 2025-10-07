'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  AlertCircle,
  Clock,
  Layers,
  TrendingUp,
  Filter,
  X,
  ChevronDown} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { boardsApi } from '@/services/trelloBoardsApi';

// Types for Board Management
export interface Board {
  _id: string;
  name: string;
  description?: string;
  background: string;
  visibility: 'private' | 'team' | 'public';
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  members?: Array<{
    userId?: {
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
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const popularColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f59e0b', '#10b981', '#14b8a6', '#3b82f6',
    '#06b6d4', '#84cc16', '#a855f7', '#ef4444'
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);

      // Upload to server to get HTTP URL
      setUploadingImage(true);
      try {
        const data = await boardsApi.uploadBackgroundImage(file);
        if (data.url) {
          // Set the Cloudinary URL as background
          setFormData(prev => ({ ...prev, background: data.url }));
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
        setImageFile(null);
        setImagePreview('');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Board</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up a new board to organize your work</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Board Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Product Roadmap, Marketing Campaign"
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What's this board about?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Background Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Board Background
            </label>

            {/* Background Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBackgroundType('color')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  backgroundType === 'color'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Color
              </button>
              <button
                type="button"
                onClick={() => setBackgroundType('image')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  backgroundType === 'image'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Image
              </button>
            </div>

            {/* Color Picker */}
            {backgroundType === 'color' && (
              <div className="space-y-3">
                <div className="grid grid-cols-6 gap-2">
                  {popularColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, background: color })}
                      className={`aspect-square rounded-md transition-all hover:scale-105 border-2 ${
                        formData.background === color ? 'border-gray-900 dark:border-gray-100 scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.background.startsWith('#') ? formData.background : '#6366f1'}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    className="w-16 h-10 rounded-md cursor-pointer border border-gray-300 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.background.startsWith('#') ? formData.background : '#6366f1'}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Image Upload */}
            {backgroundType === 'image' && (
              <div>
                <label className="block w-full cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    uploadingImage ? 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800' :
                    imagePreview
                      ? 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}>
                    {uploadingImage ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading image...</p>
                      </div>
                    ) : imagePreview ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="mx-auto h-32 rounded-md object-cover" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload background image</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div
              className="h-24 rounded-lg relative overflow-hidden border border-gray-200 dark:border-gray-700"
              style={
                formData.background.startsWith('#')
                  ? { backgroundColor: formData.background }
                  : {
                      backgroundImage: `url(${formData.background})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }
              }
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-3 left-4">
                <h3 className="font-semibold text-white text-base" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {formData.name || 'Board Name'}
                </h3>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modern Board Card Component
const BoardCard: React.FC<BoardCardProps> = ({
  board,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onStar,
  canEdit,
  canDelete,
  canArchive
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef && !buttonRef.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu, buttonRef]);

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!showMenu && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX - 120
      });
    }
    setShowMenu(!showMenu);
  };

  const getVisibilityIcon = () => {
    switch (board.visibility) {
      case 'private':
        return <Lock className="w-3.5 h-3.5" />;
      case 'team':
        return <Users className="w-3.5 h-3.5" />;
      case 'public':
        return <Globe className="w-3.5 h-3.5" />;
      default:
        return <Lock className="w-3.5 h-3.5" />;
    }
  };

  const getBackgroundStyle = () => {
    if (!board.background) {
      return { backgroundColor: '#6366f1' };
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

    return { backgroundColor: '#6366f1' };
  };

  return (
    <div className="group relative">
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
        {/* Board Preview/Background */}
        <div
          className="h-32 relative cursor-pointer overflow-hidden"
          style={getBackgroundStyle()}
          onClick={() => onView(board._id)}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

          {/* Star Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar(board._id);
            }}
            className="absolute top-3 left-3 p-2 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200 border border-white/20"
          >
            <Star className={`w-4 h-4 ${board.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
          </button>

          {/* Menu Button */}
          {(canEdit || canDelete || canArchive) && (
            <button
              ref={setButtonRef}
              onClick={handleMenuToggle}
              className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200 opacity-0 group-hover:opacity-100 border border-white/20"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>
          )}

          {/* Board Name */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-bold text-white text-lg line-clamp-2 mb-1" style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              {board.name}
            </h3>
            {board.description && (
              <p className="text-white/80 text-sm line-clamp-1" style={{
                textShadow: '0 1px 4px rgba(0,0,0,0.3)'
              }}>
                {board.description}
              </p>
            )}
          </div>
        </div>

        {/* Board Info */}
        <div className="p-4 space-y-3">
          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-gray-600 dark:text-gray-400">{board.listsCount || 0}</span>
                <span className="text-gray-400 dark:text-gray-600 text-xs">lists</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-gray-600 dark:text-gray-400">{board.cardsCount || 0}</span>
                <span className="text-gray-400 dark:text-gray-600 text-xs">cards</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              {getVisibilityIcon()}
            </div>
          </div>

          {/* Members Row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex -space-x-2">
              {board.members?.slice(0, 3).map((member, index) => (
                <div
                  key={member.userId?._id || `member-${index}`}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center ring-2 ring-transparent hover:ring-indigo-400 transition-all"
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
                    <span className="text-white text-[10px] font-semibold">
                      {member.userId?.firstName?.charAt(0) || '?'}{member.userId?.lastName?.charAt(0) || ''}
                    </span>
                  )}
                </div>
              ))}
              {board.members && board.members.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-300 text-[10px] font-semibold">+{board.members.length - 3}</span>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(board._id);
              }}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              Open
              <ChevronDown className="w-3 h-3 -rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Portal-based Dropdown Menu */}
      {showMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-48 animate-in fade-in zoom-in-95 duration-200"
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
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Open Board
          </button>
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(board._id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Details
            </button>
          )}
          {canArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(board._id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
          )}
          {canDelete && (
            <>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(board._id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Board
              </button>
            </>
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'created' | 'member' | 'starred'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'name'>('latest');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Role-based permissions
  const canCreateBoards = ['superadmin', 'admin', 'hr'].includes(userRole);
  const canEditAllBoards = ['superadmin', 'admin'].includes(userRole);
  const canDeleteAllBoards = ['superadmin'].includes(userRole);

  // Handle URL parameters on mount
  useEffect(() => {
    const starred = searchParams.get('starred');
    const create = searchParams.get('create');

    if (starred === 'true') {
      setFilterType('starred');
    }

    if (create === 'true' && canCreateBoards) {
      setShowCreateModal(true);
      // Remove the query parameter from URL
      router.replace(baseUrl + '/boards');
    }
  }, [searchParams, canCreateBoards, router, baseUrl]);

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showFilters && !target.closest('.filters-dropdown')) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const loadBoards = async () => {
    try {
      setLoading(true);
      setError(null);

      const boardsData = await boardsApi.getBoards();
      console.log('Loaded boards:', boardsData.map(b => ({ id: b._id, name: b.name, isStarred: b.isStarred })));
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
          return board.createdBy?._id === user?.id;
        case 'member':
          return board.createdBy?._id !== user?.id &&
                 board.members?.some(member => member.userId?._id === user?.id);
        case 'starred':
          return board.isStarred === true;
        case 'all':
        default:
          return true;
      }
    })
    .sort((a, b) => {
      // Always prioritize starred boards first (unless filtering by starred)
      if (filterType !== 'starred') {
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
      }

      // Then apply selected sort
      switch (sortBy) {
        case 'latest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

  const handleCreateBoard = () => {
    setShowCreateModal(true);
  };

  const handleCreateBoardSubmit = async (data: {
    name: string;
    description?: string;
    background?: string;
  }) => {
    try {
      await boardsApi.createBoard(data);
      await loadBoards();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  };

  const handleViewBoard = (boardId: string) => {
    router.push(`${baseUrl}/boards/${boardId}`);
  };

  const handleEditBoard = (boardId: string) => {
    console.log('Edit board:', boardId);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      return;
    }

    try {
      await boardsApi.deleteBoard(boardId);
      setBoards(prev => prev.filter(board => board._id !== boardId));
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    }
  };

  const handleArchiveBoard = async (boardId: string) => {
    if (!window.confirm('Are you sure you want to archive this board?')) {
      return;
    }

    try {
      await boardsApi.archiveBoard(boardId);
      setBoards(prev => prev.map(board =>
        board._id === boardId
          ? { ...board, isArchived: true }
          : board
      ));
    } catch (error) {
      console.error('Error archiving board:', error);
      alert('Failed to archive board');
    }
  };

  const handleStarBoard = async (boardId: string) => {
    try {
      const board = boards.find(b => b._id === boardId);
      if (!board) return;

      const newStarredStatus = !board.isStarred;
      await boardsApi.toggleStar(boardId);

      setBoards(prev => prev.map(b =>
        b._id === boardId ? { ...b, isStarred: newStarredStatus } : b
      ));
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading boards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to load boards</h3>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadBoards}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Layers className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Boards
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Organize and manage your projects</p>
        </div>
        {canCreateBoards && (
          <button
            onClick={handleCreateBoard}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
          >
            <Plus className="w-5 h-5" />
            Create Board
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search boards by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filterType === 'all'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('starred')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1 ${
                filterType === 'starred'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Starred
            </button>

            {/* Only show "Created by me" and "Shared with me" filters for roles that can create boards */}
            {canCreateBoards && (
              <>
                <button
                  onClick={() => setFilterType('created')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filterType === 'created'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Created by me
                </button>
                <button
                  onClick={() => setFilterType('member')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filterType === 'member'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Shared with me
                </button>
              </>
            )}

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <List className="w-5 h-5" />
            </button>

            {/* Sort Dropdown */}
            <div className="relative filters-dropdown">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <Filter className="w-4 h-4" />
                Sort
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {showFilters && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-48 z-10 animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => { setSortBy('latest'); setShowFilters(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                      sortBy === 'latest'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Latest first
                  </button>
                  <button
                    onClick={() => { setSortBy('oldest'); setShowFilters(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                      sortBy === 'oldest'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Oldest first
                  </button>
                  <button
                    onClick={() => { setSortBy('name'); setShowFilters(false); }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                      sortBy === 'name'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="w-4 h-4 flex items-center justify-center font-bold">A</span>
                    Name (A-Z)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredBoards.length}</span> {filteredBoards.length === 1 ? 'board' : 'boards'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              Clear search
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Boards Display */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
            {filterType === 'starred' ? (
              <Star className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Layers className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {filterType === 'starred'
              ? 'No starred boards'
              : searchTerm
                ? 'No boards found'
                : 'No boards yet'
            }
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {filterType === 'starred'
              ? 'Star boards to quickly access them from this view. Click the star icon on any board to add it here.'
              : searchTerm
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Create your first board to start organizing your projects and tasks in a visual way.'
            }
          </p>
          {canCreateBoards && !searchTerm && (
            <button
              onClick={handleCreateBoard}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
            >
              <Plus className="w-5 h-5" />
              Create Your First Board
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
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
              canEdit={canEditAllBoards || board.createdBy?._id === user?.id}
              canDelete={canDeleteAllBoards || board.createdBy?._id === user?.id}
              canArchive={canEditAllBoards || board.createdBy?._id === user?.id}
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
