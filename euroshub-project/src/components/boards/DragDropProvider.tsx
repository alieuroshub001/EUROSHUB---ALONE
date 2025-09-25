'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { ListData, Card } from './lists/ListContainer';

interface DragDropProviderProps {
  children: React.ReactNode;
  lists: ListData[];
  cards: Record<string, Card[]>;
  onMoveCard: (cardId: string, fromListId: string, toListId: string, newPosition: number) => void;
  onMoveList: (listId: string, newPosition: number) => void;
  onReorderCards: (listId: string, cardIds: string[]) => void;
}

interface ActiveItem {
  id: string;
  type: 'list' | 'card';
  data: ListData | Card;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  lists,
  cards,
  onMoveCard,
  onMoveList,
  onReorderCards,
}) => {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Determine if dragging a list or card
    const list = lists.find(l => l._id === activeId);
    if (list) {
      setActiveItem({
        id: activeId,
        type: 'list',
        data: list
      });
      return;
    }

    // Check if it's a card
    for (const listId in cards) {
      const card = cards[listId].find(c => c._id === activeId);
      if (card) {
        setActiveItem({
          id: activeId,
          type: 'card',
          data: card
        });
        return;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || !activeItem) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Only handle card over events for moving between lists
    if (activeItem.type === 'card') {
      // Find current list of the active card
      let currentListId: string | null = null;
      for (const listId in cards) {
        if (cards[listId].some(card => card._id === activeId)) {
          currentListId = listId;
          break;
        }
      }

      if (!currentListId) return;

      // Check if dropping over a different list
      const targetList = lists.find(l => l._id === overId);
      if (targetList && targetList._id !== currentListId) {
        // Move card to new list
        const targetListCards = cards[targetList._id] || [];
        onMoveCard(activeId, currentListId, targetList._id, targetListCards.length);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveItem(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeItem?.type === 'list') {
      // Handle list reordering
      const oldIndex = lists.findIndex(list => list._id === activeId);
      const newIndex = lists.findIndex(list => list._id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onMoveList(activeId, newIndex);
      }
    } else if (activeItem?.type === 'card') {
      // Handle card reordering within the same list or moving to different list
      let sourceListId: string | null = null;
      let targetListId: string | null = null;

      // Find source list
      for (const listId in cards) {
        if (cards[listId].some(card => card._id === activeId)) {
          sourceListId = listId;
          break;
        }
      }

      // Determine target list and position
      const targetList = lists.find(l => l._id === overId);
      if (targetList) {
        // Dropping on a list
        targetListId = targetList._id;
      } else {
        // Dropping on a card - find which list the target card belongs to
        for (const listId in cards) {
          if (cards[listId].some(card => card._id === overId)) {
            targetListId = listId;
            break;
          }
        }
      }

      if (!sourceListId || !targetListId) return;

      if (sourceListId === targetListId) {
        // Reordering within the same list
        const listCards = cards[sourceListId];
        const oldIndex = listCards.findIndex(card => card._id === activeId);
        const newIndex = listCards.findIndex(card => card._id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newCardOrder = [...listCards];
          const [movedCard] = newCardOrder.splice(oldIndex, 1);
          newCardOrder.splice(newIndex, 0, movedCard);

          onReorderCards(sourceListId, newCardOrder.map(card => card._id));
        }
      } else {
        // Moving to different list
        const targetCards = cards[targetListId] || [];
        let insertIndex = targetCards.length;

        // If dropping on a specific card, insert before it
        if (overId !== targetListId) {
          const targetCardIndex = targetCards.findIndex(card => card._id === overId);
          if (targetCardIndex !== -1) {
            insertIndex = targetCardIndex;
          }
        }

        onMoveCard(activeId, sourceListId, targetListId, insertIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={lists.map(list => list._id)} strategy={horizontalListSortingStrategy}>
        {children}
      </SortableContext>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? (
          <div className="transform rotate-5 opacity-90">
            {activeItem.type === 'list' ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 w-80 shadow-lg">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                  {(activeItem.data as ListData).name}
                </h3>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700 w-64">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  {(activeItem.data as Card).title}
                </h4>
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragDropProvider;