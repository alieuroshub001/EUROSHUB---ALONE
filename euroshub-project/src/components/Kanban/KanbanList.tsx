'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus, Lock, AlertTriangle } from 'lucide-react';
import KanbanCard from './KanbanCard';
import { clsx } from 'clsx';

interface Card {
  _id: string;
  title: string;
  description?: string;
  position: number;
  list: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  isCompleted: boolean;
  assignedMembers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }>;
  labels: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  attachmentCount: number;
  commentCount: number;
  checklistProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

interface List {
  _id: string;
  name: string;
  position: number;
  board: string;
  cards: Card[];
  settings: {
    cardLimit?: number;
    isLocked: boolean;
  };
  cardCount: number;
  color?: string;
}

interface KanbanListProps {
  list: List;
  onCreateCard: (listId: string) => void;
  onOpenCard: (card: Card) => void;
  draggedCard: Card | null;
}

export default function KanbanList({ list, onCreateCard, onOpenCard, draggedCard }: KanbanListProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: list._id
  });

  const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);
  const isCardLimitReached = list.settings.cardLimit && list.cardCount >= list.settings.cardLimit;
  const canAddCards = !list.settings.isLocked && !isCardLimitReached;

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return;

    try {
      const response = await fetch('http://localhost:5001/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: quickAddTitle.trim(),
          list: list._id
        })
      });

      if (response.ok) {
        setQuickAddTitle('');
        setIsQuickAdd(false);
        // The parent component will handle updating the state
        window.location.reload(); // Temporary solution
      } else {
        console.error('Failed to create card');
      }
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  return (
    <div className="w-72 flex-shrink-0">
      <div className="bg-gray-100 rounded-lg shadow-sm">
        {/* List Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {list.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: list.color }}
              />
            )}
            <h3 className="font-medium text-gray-900 truncate">{list.name}</h3>
            <span className="text-sm text-gray-500">
              {list.cardCount}
              {list.settings.cardLimit && `/${list.settings.cardLimit}`}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {list.settings.isLocked && (
              <Lock className="w-4 h-4 text-gray-500" />
            )}
            {isCardLimitReached && (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onCreateCard(list._id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    disabled={!canAddCards}
                  >
                    Add card
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: Implement list actions
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Copy list
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: Implement list actions
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Move list
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: Implement archive
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Archive this list
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div
          ref={setNodeRef}
          className={clsx(
            'p-2 min-h-[100px] max-h-[calc(100vh-250px)] overflow-y-auto space-y-2',
            isOver && 'bg-blue-50'
          )}
        >
          <SortableContext items={sortedCards.map(card => card._id)} strategy={verticalListSortingStrategy}>
            {sortedCards.map((card) => (
              <KanbanCard
                key={card._id}
                card={card}
                onClick={() => onOpenCard(card)}
                isDragging={draggedCard?._id === card._id}
              />
            ))}
          </SortableContext>

          {/* Drop indicator for empty lists */}
          {sortedCards.length === 0 && isOver && (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center text-blue-500">
              Drop card here
            </div>
          )}
        </div>

        {/* Add Card Section */}
        {canAddCards && (
          <div className="p-2">
            {isQuickAdd ? (
              <div className="space-y-2">
                <textarea
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="Enter a title for this card..."
                  className="w-full p-2 text-sm border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickAdd();
                    } else if (e.key === 'Escape') {
                      setIsQuickAdd(false);
                      setQuickAddTitle('');
                    }
                  }}
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleQuickAdd}
                    disabled={!quickAddTitle.trim()}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add card
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickAdd(false);
                      setQuickAddTitle('');
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsQuickAdd(true)}
                className="w-full text-left p-2 text-gray-600 hover:bg-gray-200 rounded flex items-center space-x-2 text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add a card</span>
              </button>
            )}
          </div>
        )}

        {/* Card limit warning */}
        {isCardLimitReached && (
          <div className="p-2 text-xs text-yellow-600 bg-yellow-50 border-t border-yellow-200">
            Card limit reached ({list.settings.cardLimit})
          </div>
        )}

        {/* Locked warning */}
        {list.settings.isLocked && (
          <div className="p-2 text-xs text-gray-600 bg-gray-50 border-t border-gray-200 flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>This list is locked</span>
          </div>
        )}
      </div>
    </div>
  );
}