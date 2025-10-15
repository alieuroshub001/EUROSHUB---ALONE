'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Archive,
  Settings,
  Copy,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from '../cards/SortableCard';
import ListSettingsModal from './ListSettingsModal';

export interface ListData {
  _id: string;
  boardId: string;
  name: string;
  description?: string;
  position: number;
  color?: string;
  settings: {
    wipLimit?: {
      enabled: boolean;
      limit: number;
    };
    autoMove?: {
      enabled: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions: any[];
    };
    cardLimit?: number;
  };
  cardsCount?: number;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  _id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
  coverImage?: string;
  color?: string;
  members: Array<{
    userId: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: string;
    assignedAt?: Date;
  }>;
  labels: string[];
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  budget?: number;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'planning' | 'open' | 'in_progress' | 'review' | 'blocked' | 'completed' | 'on_hold';
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachments?: any[];
  createdAt: Date;
  createdBy?: string | { _id: string; firstName: string; lastName: string; avatar?: string };
}

export interface ListContainerProps {
  list: ListData;
  cards: Card[];
  onAddCard: (listId: string, title?: string) => void;
  onEditList: (listId: string) => void;
  onUpdateList: (listId: string, updates: Partial<ListData>) => Promise<void>;
  onDeleteList: (listId: string) => void;
  onArchiveList: (listId: string) => void;
  onCardClick: (cardId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  dragHandleProps?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listeners: any;
    isDragging: boolean;
  };
}

// Card Component for inside lists (unused but kept for potential future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CardPreview: React.FC<{
  card: Card;
  onClick: (cardId: string) => void;
}> = ({ card, onClick }) => {
  const handleClick = () => {
    onClick(card._id);
  };

  // Determine the card background style
  const getCardStyle = () => {
    if (card.coverImage) {
      // If cover image exists, use it as background
      return {
        backgroundImage: `url(${card.coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    } else if (card.color) {
      // If color exists but no cover image, use solid color
      return {
        backgroundColor: card.color
      };
    }
    return {};
  };

  const cardStyle = getCardStyle();
  const hasVisualBackground = card.coverImage || card.color;

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer group ${
        hasVisualBackground
          ? 'text-white'
          : 'bg-white dark:bg-gray-800'
      }`}
      style={cardStyle}
    >
      {/* Content overlay for better text readability on images/colors */}
      <div className={`p-3 rounded-lg ${
        hasVisualBackground
          ? 'bg-black bg-opacity-40 backdrop-blur-sm'
          : ''
      }`}>

      {/* Card Title */}
      <h4 className={`font-medium text-sm mb-2 line-clamp-2 ${
        hasVisualBackground
          ? 'text-white'
          : 'text-gray-900 dark:text-white'
      }`}>
        {card.title}
      </h4>

      {/* Card Description (if exists) */}
      {card.description && (
        <p className={`text-xs mb-2 line-clamp-2 ${
          hasVisualBackground
            ? 'text-gray-100'
            : 'text-gray-600 dark:text-gray-400'
        }`}>
          {card.description}
        </p>
      )}

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 3).map((label, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded"
            >
              {label}
            </span>
          ))}
          {card.labels.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
              +{card.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Due date and Members */}
      <div className="flex items-center justify-between">
        {/* Due Date */}
        {card.dueDate && (
          <span className={`text-xs ${
            hasVisualBackground
              ? 'text-gray-100'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            Due {new Date(card.dueDate).toLocaleDateString()}
          </span>
        )}

        {/* Members */}
        <div className="flex -space-x-1">
          {card.members.slice(0, 3).map((member, index) => (
            <div
              key={member.userId?._id || `card-member-${index}`}
              className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium"
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
                <span className="text-gray-600 dark:text-gray-300">
                  {member.userId?.firstName?.charAt(0) || '?'}{member.userId?.lastName?.charAt(0) || '?'}
                </span>
              )}
            </div>
          ))}
          {card.members.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white">
              +{card.members.length - 3}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

// Main List Container Component
const ListContainer: React.FC<ListContainerProps> = ({
  list,
  cards,
  onAddCard,
  // onEditList is unused but kept in props for API compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEditList,
  onUpdateList,
  onDeleteList,
  onArchiveList,
  onCardClick,
  canEdit,
  canDelete,
  dragHandleProps,
}) => {
  const { setNodeRef } = useDroppable({
    id: list._id,
    data: {
      type: 'list',
      accepts: ['card'],
    },
  });
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(list.name);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [cardFilter, setCardFilter] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setTempTitle(list.name); // Always use current list name
  };

  // Update tempTitle when list name changes from outside
  useEffect(() => {
    if (!isEditingTitle) {
      setTempTitle(list.name);
    }
  }, [list.name, isEditingTitle]);

  const handleTitleSave = async () => {
    if (tempTitle.trim() && tempTitle !== list.name) {
      try {
        await onUpdateList(list._id, { name: tempTitle.trim() });
      } catch (error) {
        console.error('Error updating list name:', error);
        // Revert the temp title on error
        setTempTitle(list.name);
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(list.name);
    setIsEditingTitle(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleMenuToggle = () => {
    if (!showMenu && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 160 // 160px = min-w-40 * 4
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

  // Calculate dynamic margins and height based on list name length
  const getCollapsedDimensions = () => {
    if (!isCollapsed) return { height: null, topMargin: 30, bottomMargin: 30 };

    // Limit list name to prevent UI issues (max 25 characters)
    const displayName = list.name.length > 25 ? `${list.name.substring(0, 25)}...` : list.name;
    const nameLength = displayName.length;

    // Calculate dynamic top margin based on text length to prevent overlap
    // Longer names need more space from chevron when rotated
    const baseTopMargin = 40;
    const additionalMargin = Math.max(0, (nameLength - 8) * 3); // 3px extra per char beyond 8 chars
    const topMargin = Math.min(baseTopMargin + additionalMargin, 80); // Cap at 80px

    const bottomMargin = 30;

    // Calculate height needed:
    // - Chevron button: ~50px (button + space)
    // - Drag handle: ~40px (when present)
    // - Text space: nameLength * 10px (character width becomes height when rotated)
    // - Dynamic margins based on text length
    // - Card count: ~40px (badge + minimal padding)
    const chevronSpace = 50;
    const dragHandleSpace = 40; // Space for drag handle
    const textSpace = Math.max(nameLength * 10, 100);
    const cardCountSpace = 40; // Reduced to minimize bottom space

    const totalHeight = chevronSpace + dragHandleSpace + textSpace + topMargin + bottomMargin + cardCountSpace;

    return {
      height: totalHeight,
      topMargin,
      bottomMargin,
      displayName
    };
  };

  const { height, topMargin, bottomMargin, displayName } = getCollapsedDimensions();

  // Check if WIP limit is reached
  const isWIPLimitReached = list.settings.wipLimit?.enabled &&
    cards.length >= (list.settings.wipLimit?.limit || 0);

  // Filter and sort cards
  const getFilteredCards = () => {
    const sortedCards = [...cards];

    switch (cardFilter) {
      case 'newest':
        sortedCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        sortedCards.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title':
        sortedCards.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return sortedCards;
  };

  const filteredCards = getFilteredCards();

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      } flex flex-col overflow-hidden shadow-sm`}
      style={{
        height: height ? `${height}px` : 'auto',
        borderTop: list.color ? `3px solid ${list.color}` : undefined,
      }}
      data-list-id={list._id}
    >
      {/* List Header */}
      <div className={`${isCollapsed ? 'flex-col items-center' : 'flex items-center justify-between'} mb-4`}>
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title={isCollapsed ? 'Expand list' : 'Collapse list'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Drag Handle for collapsed lists - positioned after chevron */}
        {isCollapsed && dragHandleProps && (
          <div
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors mt-2"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            title="Drag to reorder list"
          >
            <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* Collapsed List Name - Centered between drag handle and card count */}
        {isCollapsed && (
          <div
            className="flex items-center justify-center flex-1"
            style={{
              marginTop: `${topMargin}px`,
              marginBottom: `${bottomMargin}px`
            }}
          >
            <div
              className="transform -rotate-90 whitespace-nowrap font-medium text-gray-900 dark:text-white text-sm cursor-pointer"
              onClick={() => setIsCollapsed(false)}
              title={`${list.name} - Click to expand`}
              style={{
                transformOrigin: 'center center'
              }}
            >
              {displayName}
            </div>
          </div>
        )}

        {/* Drag Handle */}
        {dragHandleProps && !isCollapsed && (
          <div
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors mr-2"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        {/* List Title - Only for expanded state */}
        {!isCollapsed && (
          <div className="flex-1 mr-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyPress}
                className="w-full font-bold text-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            ) : (
              <h3
                onClick={canEdit ? handleTitleEdit : undefined}
                className={`font-semibold text-base text-gray-900 dark:text-white ${
                  canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 -ml-2' : 'px-1'
                }`}
                title={canEdit ? 'Click to edit list name' : ''}
              >
                {list.name}
                {list.settings.wipLimit?.enabled && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                    isWIPLimitReached
                      ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                      : 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300'
                  }`}>
                    {cards.length}/{list.settings.wipLimit.limit}
                  </span>
                )}
              </h3>
            )}
          </div>
        )}

        {/* Filter Button - Only for expanded state */}
        {!isCollapsed && (
          <div className="relative mr-2">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Filter cards"
            >
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-32 z-50">
                <button
                  onClick={() => {
                    setCardFilter('newest');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    cardFilter === 'newest' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  Newest first
                </button>
                <button
                  onClick={() => {
                    setCardFilter('oldest');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    cardFilter === 'oldest' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  Oldest first
                </button>
                <button
                  onClick={() => {
                    setCardFilter('title');
                    setShowFilterMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    cardFilter === 'title' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : ''
                  }`}
                >
                  By title
                </button>
              </div>
            )}
          </div>
        )}

        {/* List Menu - Hide when collapsed */}
        {canEdit && !isCollapsed && (
          <div className="relative">
            <button
              ref={setButtonRef}
              onClick={handleMenuToggle}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

          </div>
        )}
      </div>

      {/* Cards - Droppable Area - Hide when collapsed */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className="space-y-3 mb-4 max-h-96 overflow-y-auto min-h-[100px] custom-scrollbar-vertical"
        >
        <SortableContext
          items={filteredCards.map(card => card._id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredCards.map((card) => (
            <SortableCard
              key={card._id}
              card={card}
              onClick={onCardClick}
            />
          ))}
        </SortableContext>

        {/* Empty state for dropping */}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-gray-400 dark:text-gray-500 text-sm">
            Drop cards here
          </div>
        )}
        </div>
      )}

      {/* Add Card Button - Hide when collapsed */}
      {!isCollapsed && (!showCreateForm ? (
        <div className="relative">
          <button
            onClick={() => !isWIPLimitReached && setShowCreateForm(true)}
            disabled={isWIPLimitReached}
            className={`w-full py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-dashed ${
              isWIPLimitReached
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
            title={isWIPLimitReached ? `WIP limit reached (${list.settings.wipLimit?.limit} cards maximum)` : 'Add a card'}
          >
            <Plus className="w-4 h-4" />
            {isWIPLimitReached ? 'WIP Limit Reached' : 'Add a card'}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
          <textarea
            ref={(el) => {
              if (el) {
                // Store reference for later use
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).currentCardTextarea = el;
              }
            }}
            placeholder="Enter a title for this card..."
            className="w-full p-2 border border-gray-300 dark:border-gray-600 resize-none focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                if (target.value.trim()) {
                  onAddCard(list._id, target.value.trim());
                  target.value = '';
                  setShowCreateForm(false);
                }
              } else if (e.key === 'Escape') {
                setShowCreateForm(false);
              }
            }}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => {
                const textarea = document.querySelector(`div[data-list-id="${list._id}"] textarea`) as HTMLTextAreaElement;
                if (textarea && textarea.value.trim()) {
                  onAddCard(list._id, textarea.value.trim());
                  textarea.value = '';
                  setShowCreateForm(false);
                }
              }}
              className="px-4 py-1.5 bg-[#17b6b2] hover:bg-[#15a09d] text-white rounded text-sm transition-colors"
            >
              Add card
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Card count at bottom when collapsed */}
      {isCollapsed && (
        <div className="mt-auto flex justify-center pb-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center border border-gray-200 dark:border-gray-600">
            {cards?.length || 0}
          </div>
        </div>
      )}

      {/* Portal-based List Menu */}
      {showMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-40"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setShowCreateForm(true);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
          <button
            onClick={() => {
              handleTitleEdit();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Edit3 className="w-4 h-4" />
            Edit Name
          </button>
          <button
            onClick={() => {
              setShowSettingsModal(true);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            List Settings
          </button>
          <button
            onClick={() => {
              // TODO: Copy list
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Copy className="w-4 h-4" />
            Copy List
          </button>
          <button
            onClick={() => {
              onArchiveList(list._id);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <Archive className="w-4 h-4" />
            Archive List
          </button>
          {canDelete && (
            <button
              onClick={() => {
                onDeleteList(list._id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Delete List
            </button>
          )}
        </div>,
        document.body
      )}

      {/* List Settings Modal */}
      <ListSettingsModal
        list={list}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdateList={onUpdateList}
      />
    </div>
  );
};

export default ListContainer;