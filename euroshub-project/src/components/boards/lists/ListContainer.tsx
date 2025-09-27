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
  ChevronRight
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from '../cards/SortableCard';
import ListSettingsModal from './ListSettingsModal';

export interface ListData {
  _id: string;
  boardId: string;
  name: string;
  position: number;
  color?: string;
  settings: {
    wipLimit?: {
      enabled: boolean;
      limit: number;
    };
    autoMove?: {
      enabled: boolean;
      conditions: any[];
    };
    cardLimit?: number;
  };
  cardsCount?: number;
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
  }>;
  labels: string[];
  dueDate?: Date;
  createdAt: Date;
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
    attributes: any;
    listeners: any;
    isDragging: boolean;
  };
}

// Card Component for inside lists
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
    // - Text space: nameLength * 10px (character width becomes height when rotated)
    // - Dynamic margins based on text length
    // - Card count: ~40px (badge + minimal padding)
    const chevronSpace = 50;
    const textSpace = Math.max(nameLength * 10, 100);
    const cardCountSpace = 40; // Reduced to minimize bottom space

    const totalHeight = chevronSpace + textSpace + topMargin + bottomMargin + cardCountSpace;

    return {
      height: totalHeight,
      topMargin,
      bottomMargin,
      displayName
    };
  };

  const { height, topMargin, bottomMargin, displayName } = getCollapsedDimensions();

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex-shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      } flex flex-col overflow-hidden`}
      style={{
        height: height ? `${height}px` : 'auto',
        borderTop: list.color ? `4px solid ${list.color}` : undefined,
      }}
      data-list-id={list._id}
    >
      {/* List Header */}
      <div className={`${isCollapsed ? 'flex-col items-center' : 'flex items-center justify-between'} mb-4`}>
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title={isCollapsed ? 'Expand list' : 'Collapse list'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Collapsed List Name - Centered between chevron and card count */}
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
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded mr-2"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
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
                className="w-full font-medium text-gray-900 dark:text-white bg-transparent border-2 border-blue-500 rounded px-2 py-1 text-sm focus:outline-none"
                autoFocus
              />
            ) : (
              <h3
                onClick={canEdit ? handleTitleEdit : undefined}
                className={`font-medium text-gray-900 dark:text-white text-sm ${
                  canEdit ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-2 py-1 -ml-2' : ''
                }`}
                title={canEdit ? 'Click to edit list name' : ''}
              >
                {list.name}
                {list.settings.wipLimit?.enabled && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({cards.length}/{list.settings.wipLimit.limit})
                  </span>
                )}
              </h3>
            )}
          </div>
        )}

        {/* List Menu - Hide when collapsed */}
        {canEdit && !isCollapsed && (
          <div className="relative">
            <button
              ref={setButtonRef}
              onClick={handleMenuToggle}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
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
          items={cards.map(card => card._id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard
              key={card._id}
              card={card}
              onClick={onCardClick}
            />
          ))}
        </SortableContext>

        {/* Empty state for dropping */}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
            Drop cards here or click "Add a card"
          </div>
        )}
        </div>
      )}

      {/* Add Card Button - Hide when collapsed */}
      {!isCollapsed && (!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full py-2 px-3 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add a card
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
          <textarea
            ref={(el) => {
              if (el) {
                // Store reference for later use
                (window as any).currentCardTextarea = el;
              }
            }}
            placeholder="Enter a title for this card..."
            className="w-full p-2 border-0 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            rows={2}
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
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Add card
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Card count at bottom when collapsed */}
      {isCollapsed && (
        <div className="mt-auto flex justify-center pb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center">
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