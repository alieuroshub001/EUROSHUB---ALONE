'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Users,
  Settings,
  MoreVertical,
  UserPlus,
  Share,
  Archive,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ListContainer, { ListData, Card } from './lists/ListContainer';
import SortableListContainer from './lists/SortableListContainer';
import CreateListForm from './lists/CreateListForm';
import EditCardModal from './cards/EditCardModal';
import DragDropProvider from './DragDropProvider';
import { Board, UserRole } from './BoardManagement';
import { boardsApi, listsApi, cardsApi } from '@/services/trelloBoardsApi';

interface BoardViewProps {
  boardId: string;
  userRole: UserRole;
  baseUrl: string;
}

const BoardView: React.FC<BoardViewProps> = ({ boardId, userRole, baseUrl }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Permission checks
  const canEditBoard = ['superadmin', 'admin'].includes(userRole) || board?.createdBy._id === user?.id;
  const canDeleteBoard = ['superadmin', 'admin'].includes(userRole) || board?.createdBy._id === user?.id;
  const canCreateLists = ['superadmin', 'admin', 'hr', 'employee'].includes(userRole);

  // Load board data
  useEffect(() => {
    loadBoardData();
  }, [boardId]);

  const loadBoardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load board details with lists and cards
      const boardData = await boardsApi.getBoard(boardId);

      setBoard(boardData);
      setLists(boardData.lists || []);

      // Transform lists data into cards grouped by list ID
      const cardsData: Record<string, Card[]> = {};
      if (boardData.lists) {
        boardData.lists.forEach(list => {
          cardsData[list._id] = list.cards || [];
        });
      }
      setCards(cardsData);
    } catch (err) {
      console.error('Error loading board data:', err);
      setError('Failed to load board data');
    } finally {
      setLoading(false);
    }
  };

  // Board actions
  const handleBack = () => {
    router.push(`${baseUrl}/boards`);
  };

  const handleStarBoard = () => {
    if (board) {
      setBoard({ ...board, isStarred: !board.isStarred });
      // TODO: API call to update star status
    }
  };

  // List actions
  const handleCreateList = async (boardId: string, name: string) => {
    try {
      const newList = await listsApi.createList(boardId, {
        name,
        position: lists.length
      });

      setLists([...lists, newList]);
      setCards({ ...cards, [newList._id]: [] });
      console.log('Created list:', newList);
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err instanceof Error ? err.message : 'Failed to create list');
    }
  };

  const handleAddCard = async (listId: string, title?: string) => {
    try {
      const newCard = await cardsApi.createCard(listId, {
        title: title || 'New Card',
        position: cards[listId]?.length || 0,
      });

      setCards(prev => ({
        ...prev,
        [listId]: [...(prev[listId] || []), newCard]
      }));

      console.log('Created card:', newCard);
    } catch (err) {
      console.error('Error creating card:', err);
      setError(err instanceof Error ? err.message : 'Failed to create card');
    }
  };

  const handleEditList = (listId: string) => {
    // TODO: Open edit list modal
    console.log('Edit list:', listId);
  };

  const handleDeleteList = (listId: string) => {
    // TODO: Show confirmation and delete list
    setLists(lists.filter(list => list._id !== listId));
    const newCards = { ...cards };
    delete newCards[listId];
    setCards(newCards);
    console.log('Delete list:', listId);
  };

  const handleArchiveList = (listId: string) => {
    // TODO: Archive list
    console.log('Archive list:', listId);
  };

  const handleCardClick = (cardId: string) => {
    // Find the card in the cards state
    let foundCard: Card | null = null;
    for (const listCards of Object.values(cards)) {
      const card = listCards.find(c => c._id === cardId);
      if (card) {
        foundCard = card;
        break;
      }
    }

    if (foundCard) {
      setSelectedCard(foundCard);
      setShowCardModal(true);
    }
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<Card>) => {
    // TODO: Replace with actual API call
    setCards(prev => {
      const newCards = { ...prev };
      for (const listId in newCards) {
        newCards[listId] = newCards[listId].map(card =>
          card._id === cardId ? { ...card, ...updates } : card
        );
      }
      return newCards;
    });

    // Update selected card if it's the one being updated
    if (selectedCard?._id === cardId) {
      setSelectedCard({ ...selectedCard, ...updates });
    }

    console.log('Updated card:', cardId, updates);
  };

  const handleDeleteCard = async (cardId: string) => {
    // TODO: Replace with actual API call
    setCards(prev => {
      const newCards = { ...prev };
      for (const listId in newCards) {
        newCards[listId] = newCards[listId].filter(card => card._id !== cardId);
      }
      return newCards;
    });

    setShowCardModal(false);
    setSelectedCard(null);
    console.log('Deleted card:', cardId);
  };

  const handleCloseCardModal = () => {
    setShowCardModal(false);
    setSelectedCard(null);
  };

  // Drag and Drop handlers
  const handleMoveCard = async (cardId: string, fromListId: string, toListId: string, newPosition: number) => {
    // Optimistically update UI
    setCards(prev => {
      const newCards = { ...prev };

      // Remove card from source list
      const sourceCards = [...newCards[fromListId]];
      const cardIndex = sourceCards.findIndex(card => card._id === cardId);
      if (cardIndex === -1) return prev;

      const [movedCard] = sourceCards.splice(cardIndex, 1);
      newCards[fromListId] = sourceCards;

      // Add card to target list at new position
      const targetCards = [...(newCards[toListId] || [])];
      targetCards.splice(newPosition, 0, { ...movedCard, listId: toListId });
      newCards[toListId] = targetCards;

      return newCards;
    });

    try {
      // Call API to persist the move
      if (fromListId !== toListId) {
        await cardsApi.moveCard(cardId, toListId, newPosition);
      } else {
        await cardsApi.reorderCard(cardId, newPosition);
      }
      console.log(`Moved card ${cardId} from ${fromListId} to ${toListId} at position ${newPosition}`);
    } catch (err) {
      console.error('Error moving card:', err);
      // Revert the optimistic update
      loadBoardData();
      setError(err instanceof Error ? err.message : 'Failed to move card');
    }
  };

  const handleMoveList = async (listId: string, newPosition: number, newListOrder?: ListData[]) => {
    console.log('BoardView handleMoveList called:', { listId, newPosition, hasNewOrder: !!newListOrder });

    // Optimistically update UI
    if (newListOrder) {
      // Use the pre-calculated order from DragDropProvider
      console.log('Updating lists with new order:', newListOrder.map(l => l.name));
      setLists(newListOrder);
    } else {
      // Fallback to manual calculation
      setLists(prev => {
        const newLists = [...prev];
        const currentIndex = newLists.findIndex(list => list._id === listId);

        if (currentIndex === -1) return prev;

        const [movedList] = newLists.splice(currentIndex, 1);
        newLists.splice(newPosition, 0, movedList);

        return newLists;
      });
    }

    try {
      // Call API to persist the move
      await listsApi.reorderList(listId, newPosition);
      console.log(`Moved list ${listId} to position ${newPosition}`);
    } catch (err) {
      console.error('Error moving list:', err);
      // Revert the optimistic update
      loadBoardData();
      setError(err instanceof Error ? err.message : 'Failed to move list');
    }
  };

  const handleReorderCards = (listId: string, cardIds: string[]) => {
    setCards(prev => {
      const newCards = { ...prev };
      const listCards = newCards[listId] || [];

      // Reorder cards based on the new order
      const reorderedCards = cardIds.map(cardId =>
        listCards.find(card => card._id === cardId)
      ).filter(Boolean) as Card[];

      newCards[listId] = reorderedCards;
      return newCards;
    });

    console.log(`Reordered cards in list ${listId}:`, cardIds);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-700 dark:text-red-400">{error || 'Board not found'}</span>
        </div>
      </div>
    );
  }

  const backgroundStyle = board.background?.startsWith('#')
    ? { backgroundColor: board.background }
    : board.background?.startsWith('http')
    ? { backgroundImage: `url(${board.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: '#6366f1' };

  return (
    <div className="h-full flex flex-col" style={backgroundStyle}>
      {/* Board Header */}
      <div className="bg-black bg-opacity-20 p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-xl font-bold">{board.name}</h1>

          <button
            onClick={handleStarBoard}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200"
          >
            <Star className={`w-5 h-5 ${board.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Board Members */}
          <div className="flex -space-x-2 mr-4">
            {board.members.slice(0, 5).map((member) => (
              <div
                key={member.userId._id}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 border-2 border-white flex items-center justify-center text-sm font-medium"
                title={`${member.userId.firstName} ${member.userId.lastName} (${member.role})`}
              >
                {member.userId.avatar ? (
                  <img
                    src={member.userId.avatar}
                    alt={`${member.userId.firstName} ${member.userId.lastName}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                  </span>
                )}
              </div>
            ))}
            {board.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-white bg-opacity-30 border-2 border-white flex items-center justify-center text-sm font-medium">
                +{board.members.length - 5}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {canEditBoard && (
            <>
              <button className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center gap-2 text-sm transition-colors duration-200">
                <UserPlus className="w-4 h-4" />
                Invite
              </button>

              <button className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center gap-2 text-sm transition-colors duration-200">
                <Share className="w-4 h-4" />
                Share
              </button>
            </>
          )}

          {/* Board Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors duration-200"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 min-w-48">
                {canEditBoard && (
                  <>
                    <button className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <Settings className="w-4 h-4" />
                      Board Settings
                    </button>
                    <button className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <Archive className="w-4 h-4" />
                      Archive Board
                    </button>
                  </>
                )}
                {canDeleteBoard && (
                  <button className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <Trash2 className="w-4 h-4" />
                    Delete Board
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board Content - Lists */}
      <div className="flex-1 p-4 overflow-x-auto">
        <DragDropProvider
          lists={lists}
          cards={cards}
          onMoveCard={handleMoveCard}
          onMoveList={handleMoveList}
          onReorderCards={handleReorderCards}
        >
          <div className="flex gap-4 h-full">
            {lists.map((list) => (
              <SortableListContainer
                key={list._id}
                id={list._id}
                list={list}
                cards={cards[list._id] || []}
                onAddCard={handleAddCard}
                onEditList={handleEditList}
                onDeleteList={handleDeleteList}
                onArchiveList={handleArchiveList}
                onCardClick={handleCardClick}
                canEdit={canEditBoard}
                canDelete={canDeleteBoard}
              />
            ))}

            {/* Add List Form */}
            {canCreateLists && (
              <CreateListForm
                boardId={boardId}
                onCreateList={handleCreateList}
              />
            )}
          </div>
        </DragDropProvider>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <EditCardModal
          card={selectedCard}
          isOpen={showCardModal}
          onClose={handleCloseCardModal}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          canEdit={canEditBoard}
          canDelete={canDeleteBoard}
        />
      )}
    </div>
  );
};

export default BoardView;