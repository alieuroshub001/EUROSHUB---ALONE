'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { List, Card } from '@/types/project';
import KanbanCard from './KanbanCard';

interface KanbanListProps {
  list: List;
  cards: Card[];
  onAddCard: () => void;
  onCardClick: (card: Card) => void;
}

const KanbanList = ({ list, cards, onAddCard, onCardClick }: KanbanListProps) => {
  const { setNodeRef } = useDroppable({
    id: list._id,
  });

  const cardIds = cards.map(card => card._id);

  return (
    <div className="flex flex-col w-80 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* List Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: list.color }}
          />
          <h3 className="font-semibold text-gray-900">{list.title}</h3>
          <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
            {cards.length}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onAddCard}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Add card"
          >
            <Plus size={16} />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card._id}
              card={card}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>

        {/* Empty State */}
        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Plus size={20} />
            </div>
            <p className="text-sm font-medium">No cards yet</p>
            <button
              onClick={onAddCard}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Add a card
            </button>
          </div>
        )}
      </div>

      {/* Add Card Button */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onAddCard}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Plus size={16} />
          <span>Add a card</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanList;