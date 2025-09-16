'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanBoard from '@/components/Kanban/KanbanBoard';
import BoardHeader from '@/components/Kanban/BoardHeader';
import CreateListModal from '@/components/Kanban/CreateListModal';
import CreateCardModal from '@/components/Kanban/CreateCardModal';
import CardDetailModal from '@/components/Kanban/CardDetailModal';
import { useAuth } from '@/hooks/useAuth';

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

interface Board {
  _id: string;
  name: string;
  description?: string;
  project: {
    _id: string;
    name: string;
  };
  backgroundColor: string;
  lists: List[];
  labels: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  settings: {
    voting: boolean;
    comments: boolean;
    selfJoin: boolean;
    cardCover: boolean;
    cardAging: boolean;
  };
}

export default function BoardPage({
  params
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const resolvedParams = use(params);
  const { id: projectId, boardId } = resolvedParams;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [targetListId, setTargetListId] = useState<string>('');
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);

  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3
      }
    })
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    fetchBoard();
  }, [isAuthenticated, router, boardId]);

  const fetchBoard = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/boards/${boardId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBoard(data.data.board);
      } else if (response.status === 404) {
        router.push('/projects');
      } else {
        console.error('Failed to fetch board');
      }
    } catch (error) {
      console.error('Error fetching board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeCard = board?.lists
      .flatMap(list => list.cards)
      .find(card => card._id === active.id);
    setDraggedCard(activeCard || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active card and over container
    const activeCard = board.lists.flatMap(list => list.cards).find(card => card._id === activeId);
    if (!activeCard) return;

    const activeList = board.lists.find(list =>
      list.cards.some(card => card._id === activeId)
    );
    const overList = board.lists.find(list =>
      list._id === overId || list.cards.some(card => card._id === overId)
    );

    if (!activeList || !overList || activeList._id === overList._id) return;

    // Moving card to different list
    setBoard(prevBoard => {
      if (!prevBoard) return prevBoard;

      const newLists = prevBoard.lists.map(list => {
        if (list._id === activeList._id) {
          return {
            ...list,
            cards: list.cards.filter(card => card._id !== activeId)
          };
        } else if (list._id === overList._id) {
          const overCard = list.cards.find(card => card._id === overId);
          const insertIndex = overCard ? list.cards.indexOf(overCard) : list.cards.length;

          const newCards = [...list.cards];
          newCards.splice(insertIndex, 0, { ...activeCard, list: list._id });

          return {
            ...list,
            cards: newCards
          };
        }
        return list;
      });

      return { ...prevBoard, lists: newLists };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedCard(null);

    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    try {
      // Find the active card
      const activeCard = board.lists.flatMap(list => list.cards).find(card => card._id === activeId);
      if (!activeCard) return;

      const activeList = board.lists.find(list =>
        list.cards.some(card => card._id === activeId)
      );
      const overList = board.lists.find(list =>
        list._id === overId || list.cards.some(card => card._id === overId)
      );

      if (!activeList || !overList) return;

      // Calculate new position
      let newPosition = 0;
      if (overId !== overList._id) {
        // Dropping on a card
        const overCard = overList.cards.find(card => card._id === overId);
        if (overCard) {
          newPosition = overCard.position;
        }
      } else {
        // Dropping on list - add to end
        newPosition = overList.cards.length;
      }

      // Make API call to move card
      const moveData: any = {
        position: newPosition
      };

      if (activeList._id !== overList._id) {
        moveData.targetList = overList._id;
      }

      const response = await fetch(`http://localhost:5001/api/cards/${activeId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(moveData)
      });

      if (!response.ok) {
        console.error('Failed to move card');
        // Refresh board to restore correct state
        fetchBoard();
      }
    } catch (error) {
      console.error('Error moving card:', error);
      fetchBoard();
    }
  };

  const handleCreateList = async (name: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          board: boardId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBoard(prevBoard => {
          if (!prevBoard) return prevBoard;
          return {
            ...prevBoard,
            lists: [...prevBoard.lists, { ...data.data.list, cards: [] }]
          };
        });
        setShowCreateListModal(false);
      } else {
        console.error('Failed to create list');
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const handleCreateCard = async (cardData: { title: string; description?: string }) => {
    try {
      const response = await fetch('http://localhost:5001/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...cardData,
          list: targetListId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBoard(prevBoard => {
          if (!prevBoard) return prevBoard;

          const newLists = prevBoard.lists.map(list => {
            if (list._id === targetListId) {
              return {
                ...list,
                cards: [...list.cards, data.data.card]
              };
            }
            return list;
          });

          return { ...prevBoard, lists: newLists };
        });
        setShowCreateCardModal(false);
        setTargetListId('');
      } else {
        console.error('Failed to create card');
      }
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const handleOpenCreateCardModal = (listId: string) => {
    setTargetListId(listId);
    setShowCreateCardModal(true);
  };

  const handleOpenCardDetail = (card: Card) => {
    setSelectedCard(card);
  };

  const handleUpdateCard = (updatedCard: Card) => {
    setBoard(prevBoard => {
      if (!prevBoard) return prevBoard;

      const newLists = prevBoard.lists.map(list => {
        if (list._id === updatedCard.list) {
          return {
            ...list,
            cards: list.cards.map(card =>
              card._id === updatedCard._id ? updatedCard : card
            )
          };
        }
        return list;
      });

      return { ...prevBoard, lists: newLists };
    });
    setSelectedCard(updatedCard);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Board not found</h2>
          <p className="text-gray-600">The board you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: board.backgroundColor || '#0079bf' }}
    >
      {/* Board Header */}
      <BoardHeader
        board={board}
        onUpdateBoard={setBoard}
      />

      {/* Kanban Board */}
      <div className="p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={board.lists.map(list => list._id)} strategy={horizontalListSortingStrategy}>
            <KanbanBoard
              lists={board.lists}
              onCreateCard={handleOpenCreateCardModal}
              onOpenCard={handleOpenCardDetail}
              onCreateList={() => setShowCreateListModal(true)}
              draggedCard={draggedCard}
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* Modals */}
      {showCreateListModal && (
        <CreateListModal
          onClose={() => setShowCreateListModal(false)}
          onCreated={handleCreateList}
        />
      )}

      {showCreateCardModal && (
        <CreateCardModal
          onClose={() => {
            setShowCreateCardModal(false);
            setTargetListId('');
          }}
          onCreated={handleCreateCard}
        />
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
          boardLabels={board.labels}
        />
      )}
    </div>
  );
}