'use client';

import { useState } from 'react';
import {
  Plus,
  MoreVertical,
  Edit3,
  Trash2,
  Archive,
  Settings,
  Copy,
  X
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableCard from '../cards/SortableCard';

export interface ListData {
  _id: string;
  boardId: string;
  name: string;
  position: number;
  settings: {
    wipLimit?: number;
    autoArchive: boolean;
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
  onAddCard: (listId: string) => void;
  onEditList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onArchiveList: (listId: string) => void;
  onCardClick: (cardId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

// Card Component for inside lists
const CardPreview: React.FC<{
  card: Card;
  onClick: (cardId: string) => void;
}> = ({ card, onClick }) => {
  const handleClick = () => {
    onClick(card._id);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer group"
    >
      {/* Cover Image */}
      {card.coverImage && (
        <div
          className="h-20 rounded-md mb-3 bg-cover bg-center"
          style={{ backgroundImage: `url(${card.coverImage})` }}
        />
      )}

      {/* Card Title */}
      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
        {card.title}
      </h4>

      {/* Card Description (if exists) */}
      {card.description && (
        <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-2">
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
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Due {new Date(card.dueDate).toLocaleDateString()}
          </span>
        )}

        {/* Members */}
        <div className="flex -space-x-1">
          {card.members.slice(0, 3).map((member) => (
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
          {card.members.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white">
              +{card.members.length - 3}
            </div>
          )}
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
  onDeleteList,
  onArchiveList,
  onCardClick,
  canEdit,
  canDelete,
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

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
    setTempTitle(list.name);
  };

  const handleTitleSave = () => {
    if (tempTitle.trim() && tempTitle !== list.name) {
      // TODO: Call API to update list name
      console.log('Update list name:', list._id, tempTitle);
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

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 w-80 flex-shrink-0">
      {/* List Header */}
      <div className="flex items-center justify-between mb-4">
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
              {list.settings.wipLimit && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({cards.length}/{list.settings.wipLimit})
                </span>
              )}
            </h3>
          )}
        </div>

        {/* List Menu */}
        {canEdit && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-40">
                <button
                  onClick={() => {
                    onAddCard(list._id);
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
                    onEditList(list._id);
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards - Droppable Area */}
      <div
        ref={setNodeRef}
        className="space-y-3 mb-4 max-h-96 overflow-y-auto min-h-[100px]"
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

      {/* Add Card Button */}
      {!showCreateForm ? (
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
            placeholder="Enter a title for this card..."
            className="w-full p-2 border-0 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                if (target.value.trim()) {
                  onAddCard(list._id);
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
                onAddCard(list._id);
                setShowCreateForm(false);
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
      )}
    </div>
  );
};

export default ListContainer;