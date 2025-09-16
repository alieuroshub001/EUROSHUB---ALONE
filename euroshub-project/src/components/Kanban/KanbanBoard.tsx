'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import KanbanList from './KanbanList';
import { Plus } from 'lucide-react';

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

interface KanbanBoardProps {
  lists: List[];
  onCreateCard: (listId: string) => void;
  onOpenCard: (card: Card) => void;
  onCreateList: () => void;
  draggedCard: Card | null;
}

function SortableList({ list, onCreateCard, onOpenCard, draggedCard }: {
  list: List;
  onCreateCard: (listId: string) => void;
  onOpenCard: (card: Card) => void;
  draggedCard: Card | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: list._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex-shrink-0"
    >
      <KanbanList
        list={list}
        onCreateCard={onCreateCard}
        onOpenCard={onOpenCard}
        draggedCard={draggedCard}
      />
    </div>
  );
}

export default function KanbanBoard({
  lists,
  onCreateCard,
  onOpenCard,
  onCreateList,
  draggedCard
}: KanbanBoardProps) {
  const sortedLists = [...lists].sort((a, b) => a.position - b.position);

  return (
    <div className="flex space-x-4 h-full overflow-x-auto pb-4">
      {/* Lists */}
      {sortedLists.map((list) => (
        <SortableList
          key={list._id}
          list={list}
          onCreateCard={onCreateCard}
          onOpenCard={onOpenCard}
          draggedCard={draggedCard}
        />
      ))}

      {/* Add List Button */}
      <div className="flex-shrink-0">
        <button
          onClick={onCreateList}
          className="w-72 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg p-3 flex items-center justify-center space-x-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add another list</span>
        </button>
      </div>
    </div>
  );
}