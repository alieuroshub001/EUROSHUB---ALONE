import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Star,
  MoreVertical,
  Lock,
  Users,
  Globe,
  Eye,
  Edit,
  Archive,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Board } from '../types';

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (showMenu) {
      setShowMenu(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      
      setMenuPosition({
        top: rect.bottom + scrollY + 8,
        left: rect.left - 150
      });
      setShowMenu(true);
    }
  };

  const setButtonRef = (element: HTMLButtonElement | null) => {
    buttonRef.current = element;
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

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
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
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

export default BoardCard;