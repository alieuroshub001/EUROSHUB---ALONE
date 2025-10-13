'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Users,
  MoreVertical,
  Trash2,
  Edit
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocketContext } from '@/contexts/SocketContext';
import { ListData, Card } from './lists/ListContainer';
import SortableListContainer from './lists/SortableListContainer';
import CreateListForm from './lists/CreateListForm';
import ProjectModal from './cards/ProjectModal';
import DragDropProvider from './DragDropProvider';
import { Board, UserRole } from './BoardManagement';
import { boardsApi, listsApi, cardsApi } from '@/services/trelloBoardsApi';
import BoardSwitcherDock from './BoardSwitcherDock';
import BoardMembersModal from './BoardMembersModal';
import toast from 'react-hot-toast';

// Import the EditBoardModal component
interface EditBoardModalProps {
  board: Board;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    background?: string;
  }) => Promise<void> | void;
}

// EditBoardModal component (simplified version for BoardView)
const EditBoardModal: React.FC<EditBoardModalProps> = ({ board, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || '',
    background: board.background
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error updating board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Board</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your board details</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#17b6b2] focus:border-transparent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="What's this board about?"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#17b6b2] focus:border-transparent transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 px-6 py-2.5 bg-[#17b6b2] text-white font-medium rounded-lg hover:bg-[#15a09d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Updating...' : 'Update Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BoardViewProps {
  boardId: string;
  userRole: UserRole;
  baseUrl: string;
}

const BoardView: React.FC<BoardViewProps> = ({ boardId, userRole, baseUrl }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { socket, isConnected } = useSocketContext();
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Permission checks
  const getCurrentUserBoardRole = () => {
    if (!user || !board) return null;
const member = board.members?.find(m => m.userId?._id === user.id);    return member?.role || null;
  };

  const currentUserBoardRole = getCurrentUserBoardRole();
  const canEditBoard = ['superadmin', 'admin'].includes(userRole) ||
board?.createdBy?._id === user?.id ||                      ['owner', 'admin', 'editor'].includes(currentUserBoardRole || '');
  const canDeleteBoard = ['superadmin', 'admin'].includes(userRole) ||
board?.createdBy?._id === user?.id ||                         currentUserBoardRole === 'owner';
  const canCreateLists = ['superadmin', 'admin', 'hr', 'employee'].includes(userRole) ||
                        ['owner', 'admin', 'editor'].includes(currentUserBoardRole || '');
  const canManageMembers = ['superadmin', 'admin'].includes(userRole) ||
board?.createdBy?._id === user?.id ||                          ['owner', 'admin'].includes(currentUserBoardRole || '');

  // Load board data
  useEffect(() => {
    loadBoardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !boardId) return;

    // Join board room
    socket.emit('join-board', boardId);
    console.log(`📡 Joined board room: ${boardId}`);

    // Listen for card creation
    const handleCardCreated = (data: { listId: string; card: Card }) => {
      console.log('📬 Card created:', data);
      setCards(prev => ({
        ...prev,
        [data.listId]: [...(prev[data.listId] || []), data.card]
      }));
    };

    // Listen for task creation
    const handleTaskCreated = (data: { cardId: string; task: any }) => {
      console.log('✅ Task created:', data);
      // Update the card in the cards state
      setCards(prev => {
        const newCards = { ...prev };
        Object.keys(newCards).forEach(listId => {
          newCards[listId] = newCards[listId].map(card =>
            card._id === data.cardId
              ? { ...card, tasks: [...(card.tasks || []), data.task] }
              : card
          );
        });
        return newCards;
      });
    };

    // Listen for task updates
    const handleTaskUpdated = (data: { cardId: string; taskId: string; task: any }) => {
      console.log('🔄 Task updated:', data);
      setCards(prev => {
        const newCards = { ...prev };
        Object.keys(newCards).forEach(listId => {
          newCards[listId] = newCards[listId].map(card => {
            if (card._id === data.cardId && card.tasks) {
              return {
                ...card,
                tasks: card.tasks.map(task =>
                  task._id === data.taskId ? data.task : task
                )
              };
            }
            return card;
          });
        });
        return newCards;
      });
    };

    // Listen for task deletion
    const handleTaskDeleted = (data: { cardId: string; taskId: string }) => {
      console.log('🗑️ Task deleted:', data);
      setCards(prev => {
        const newCards = { ...prev };
        Object.keys(newCards).forEach(listId => {
          newCards[listId] = newCards[listId].map(card => {
            if (card._id === data.cardId && card.tasks) {
              return {
                ...card,
                tasks: card.tasks.filter(task => task._id !== data.taskId)
              };
            }
            return card;
          });
        });
        return newCards;
      });
    };

    socket.on('card:created', handleCardCreated);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('card:created', handleCardCreated);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.emit('leave-board', boardId);
      console.log(`📡 Left board room: ${boardId}`);
    };
  }, [socket, isConnected, boardId]);

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

  const handleStarBoard = async () => {
    if (board) {
      try {
        // Optimistically update UI
        setBoard({ ...board, isStarred: !board.isStarred });

        // Call backend API to update star status
        const result = await boardsApi.toggleStar(board._id);

        // Update with backend response
        setBoard(prev => prev ? { ...prev, isStarred: result.isStarred } : null);

        console.log('Star status updated:', result.isStarred);
        const action = result.isStarred ? 'starred' : 'unstarred';
        toast.success(`Board "${board.name}" ${action} successfully`);
      } catch (err) {
        console.error('Error updating star status:', err);
        // Revert on error
        setBoard(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
        toast.error('Failed to update star status');
        setError(err instanceof Error ? err.message : 'Failed to update star status');
      }
    }
  };

  // Board header menu actions
  const handleEditBoard = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleEditBoardSubmit = async (data: {
    name: string;
    description?: string;
    background?: string;
  }) => {
    if (!board) return;
    
    try {
      await boardsApi.updateBoard(board._id, data);
      // Reload board data to get updated information
      await loadBoardData();
      toast.success('Board updated successfully!');
    } catch (error) {
      console.error('Error updating board:', error);
      toast.error('Failed to update board');
      throw error;
    }
  };

  const handleDeleteBoard = async () => {
    if (!board) return;
    
    const boardName = board.name;
    if (!window.confirm(`Are you sure you want to delete "${boardName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await boardsApi.deleteBoard(board._id);
      toast.success(`Board "${boardName}" deleted successfully`);
      // Navigate back to boards list
      router.push(`${baseUrl}/boards`);
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    }
    setShowMenu(false);
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
      toast.success(`List "${name}" created successfully`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to create list';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission') || errorMsg.includes('create lists');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to create lists in this board');
        setShowErrorModal(true);
        toast.error('You do not have permission to create lists in this board');
      } else {
        // For other errors, log to console and show modal
        console.error('Error creating list:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        toast.error('Failed to create list');
      }

      // Only set the general error state for non-permission errors
      if (!isPermissionError) {
        setError(errorMsg);
      }
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
      toast.success(`Card "${title || 'New Card'}" created successfully`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to create card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to create cards in this list');
        setShowErrorModal(true);
        toast.error('You do not have permission to create cards in this list');
      } else {
        // For other errors, log to console and show modal
        console.error('Error creating card:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        toast.error('Failed to create card');
      }

      // Only set general error state for non-permission errors
      if (!errorMsg.includes('permission') && !errorMsg.includes('not have permission')) {
        setError(errorMsg);
      }
    }
  };

  const handleEditList = (listId: string) => {
    // TODO: Open edit list modal
    console.log('Edit list:', listId);
  };

  const handleUpdateList = async (listId: string, updates: Partial<ListData>) => {
    try {
      const updatedList = await listsApi.updateList(listId, {
        name: updates.name,
        description: updates.description,
        color: updates.color,
        settings: updates.settings,
      });

      // Update local state
      setLists(prev => prev.map(list =>
        list._id === listId ? { ...list, ...updatedList } : list
      ));

      console.log('Updated list:', updatedList);
      toast.success(`List "${updates.name || updatedList.name}" updated successfully`);
    } catch (err) {
      console.error('Error updating list:', err);
      setError(err instanceof Error ? err.message : 'Failed to update list');
      toast.error('Failed to update list');
      throw err; // Re-throw so the modal can handle it
    }
  };

  const handleDeleteList = async (listId: string) => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return;
    }

    try {
      // Call backend API to delete the list
      await listsApi.deleteList(listId);

      // Get list name before deletion for toast message
      const deletedList = lists.find(list => list._id === listId);
      const listName = deletedList?.name || 'List';

      // Update local state to remove the list and its cards
      setLists(lists.filter(list => list._id !== listId));
      const newCards = { ...cards };
      delete newCards[listId];
      setCards(newCards);

      console.log('Deleted list:', listId);
      toast.success(`List "${listName}" deleted successfully`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete list';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to delete this list');
        setShowErrorModal(true);
        toast.error('You do not have permission to delete this list');
      } else {
        // For other errors, log to console and show modal
        console.error('Error deleting list:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        toast.error('Failed to delete list');
      }

      // Only set general error state for non-permission errors
      if (!errorMsg.includes('permission') && !errorMsg.includes('not have permission')) {
        setError(errorMsg);
      }
    }
  };

  const handleArchiveList = async (listId: string) => {
    try {
      // Get list name before archiving for toast message
      const listToArchive = lists.find(list => list._id === listId);
      const listName = listToArchive?.name || 'List';

      // Call backend API to archive the list
      const result = await listsApi.archiveList(listId);

      // Update local state to mark the list as archived
      setLists(lists.map(list =>
        list._id === listId
          ? { ...list, isArchived: result.isArchived }
          : list
      ));

      console.log('Archived list:', listId, result.isArchived);
      const action = result.isArchived ? 'archived' : 'unarchived';
      toast.success(`List "${listName}" ${action} successfully`);
    } catch (err) {
      console.error('Error archiving list:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive list');
      toast.error('Failed to archive list');
    }
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
    try {
      // Call backend API to update the card
      const updatedCard = await cardsApi.updateCard(cardId, updates);

      // Update local state with the response from backend
      setCards(prev => {
        const newCards = { ...prev };
        for (const listId in newCards) {
          newCards[listId] = newCards[listId].map(card =>
            card._id === cardId ? { ...card, ...updatedCard } : card
          );
        }
        return newCards;
      });

      // Update selected card if it's the one being updated
      if (selectedCard?._id === cardId) {
        setSelectedCard({ ...selectedCard, ...updatedCard });
      }

      console.log('Updated card:', cardId, updatedCard);
      toast.success(`Card "${updates.title || updatedCard.title || 'Card'}" updated successfully`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to update card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to update this card');
        setShowErrorModal(true);
        toast.error('You do not have permission to update this card');
      } else {
        // For other errors, log to console and show modal
        console.error('Error updating card:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        toast.error('Failed to update card');
      }

      // Only set general error state for non-permission errors
      if (!errorMsg.includes('permission') && !errorMsg.includes('not have permission')) {
        setError(errorMsg);
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      // Get card name before deletion for toast message
      let cardName = 'Card';
      if (selectedCard?._id === cardId) {
        cardName = selectedCard.title;
      } else {
        // Find the card in the cards state
        for (const listId in cards) {
          const card = cards[listId].find(c => c._id === cardId);
          if (card) {
            cardName = card.title;
            break;
          }
        }
      }

      // Call backend API to delete the card
      await cardsApi.deleteCard(cardId);

      // Update local state to remove the card
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
      toast.success(`Card "${cardName}" deleted successfully`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to delete this card');
        setShowErrorModal(true);
        toast.error('You do not have permission to delete this card');
      } else {
        // For other errors, log to console and show modal
        console.error('Error deleting card:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        toast.error('Failed to delete card');
      }

      // Only set general error state for non-permission errors
      if (!errorMsg.includes('permission') && !errorMsg.includes('not have permission')) {
        setError(errorMsg);
      }
    }
  };

  const handleCloseCardModal = () => {
    setShowCardModal(false);
    setSelectedCard(null);
  };

  // Drag and Drop handlers
  const handleMoveCard = async (cardId: string, fromListId: string, toListId: string, newPosition: number) => {
    // Validate input parameters
    if (!cardId || !fromListId || !toListId || newPosition < 0) {
      console.error('Invalid move card parameters:', { cardId, fromListId, toListId, newPosition });
      setError('Invalid card move parameters');
      return;
    }

    // Check if source list and cards exist
    if (!cards[fromListId]) {
      console.error('Source list not found:', fromListId);
      setError('Source list not found');
      return;
    }

    // Find the card in source list
    const sourceCard = cards[fromListId].find(card => card._id === cardId);
    if (!sourceCard) {
      console.error('Card not found in source list:', { cardId, fromListId });
      setError('Card not found in source list');
      return;
    }

    // Validate target list exists
    const targetList = lists.find(list => list._id === toListId);
    if (!targetList) {
      console.error('Target list not found:', toListId);
      setError('Target list not found');
      return;
    }

    // Ensure target list cards array exists
    if (!cards[toListId]) {
      setCards(prev => ({ ...prev, [toListId]: [] }));
    }

    // Validate position
    const maxPosition = cards[toListId]?.length || 0;
    const validPosition = Math.max(0, Math.min(newPosition, maxPosition));

    console.log('Moving card:', {
      cardId,
      fromListId,
      toListId,
      originalPosition: newPosition,
      validPosition,
      sourceCard: sourceCard.title,
      sourceListName: lists.find(l => l._id === fromListId)?.name,
      targetListName: targetList.name
    });

    // Optimistically update UI
    setCards(prev => {
      const newCards = { ...prev };

      // Remove card from source list
      const sourceCards = [...newCards[fromListId]];
      const cardIndex = sourceCards.findIndex(card => card._id === cardId);
      if (cardIndex === -1) return prev;

      const [movedCard] = sourceCards.splice(cardIndex, 1);
      newCards[fromListId] = sourceCards;

      // Add card to target list at validated position
      const targetCards = [...(newCards[toListId] || [])];
      targetCards.splice(validPosition, 0, { ...movedCard, listId: toListId });
      newCards[toListId] = targetCards;

      return newCards;
    });

    // Temporarily store the original console.error to restore later
    const originalConsoleError = console.error;

    try {
      // Temporarily suppress console.error for permission-related errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (!message.includes('permission') && !message.includes('not have permission')) {
          originalConsoleError(...args);
        }
      };

      // Call API to persist the move
      if (fromListId !== toListId) {
        await cardsApi.moveCard(cardId, toListId, validPosition);
      } else {
        await cardsApi.reorderCard(cardId, validPosition);
      }
      console.log(`Successfully moved card ${cardId} from ${fromListId} to ${toListId} at position ${validPosition}`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to move card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission') || errorMsg.includes('move this card');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to move this card');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        originalConsoleError('Error moving card:', err);
        originalConsoleError('Card details:', {
          cardId,
          fromListId,
          toListId,
          newPosition,
          sourceCard: sourceCard ? {
            id: sourceCard._id,
            title: sourceCard.title,
            listId: sourceCard.listId
          } : null,
          cardsInSourceList: cards[fromListId]?.length || 0,
          cardsInTargetList: cards[toListId]?.length || 0
        });
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }

      // Revert the optimistic update
      loadBoardData();

      // Only set general error state for non-permission errors
      if (!isPermissionError) {
        setError(errorMsg);
      }
    } finally {
      // Always restore the original console.error
      console.error = originalConsoleError;
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

    // Temporarily store the original console.error to restore later
    const originalConsoleError = console.error;

    try {
      // Temporarily suppress console.error for permission-related errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (!message.includes('permission') && !message.includes('not have permission') && !message.includes('reorder')) {
          originalConsoleError(...args);
        }
      };

      // Call API to persist the move with complete list order
      const currentLists = newListOrder || lists;
      const listOrderData = currentLists.map(list => ({ listId: list._id }));

      await listsApi.reorderList(listId, newPosition, listOrderData);
      console.log(`Moved list ${listId} to position ${newPosition}`);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to move list';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission') || errorMsg.includes('reorder this list');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to reorder this list');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        originalConsoleError('Error moving list:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }

      // Revert the optimistic update
      loadBoardData();

      // Only set general error state for non-permission errors
      if (!isPermissionError) {
        setError(errorMsg);
      }
    } finally {
      // Always restore the original console.error
      console.error = originalConsoleError;
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
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-[#17b6b2] rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Board not found</h3>
          <p className="text-gray-500 dark:text-gray-400">{error || 'The board you are looking for does not exist or you do not have permission to view it.'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-[#17b6b2] text-white rounded-lg hover:bg-[#15a09d] transition-colors"
          >
            Back to Boards
          </button>
        </div>
      </div>
    );
  }


  // Board member management functions
  const handleAddBoardMember = async (userId: string, role: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await boardsApi.addMember(boardId, userId, role as any);

      // Reload board data to get updated members
      await loadBoardData();
    } catch (error) {
      console.error('Error adding board member:', error);
      setError('Failed to add member to board');
    }
  };

  const handleRemoveBoardMember = async (userId: string) => {
    try {
      await boardsApi.removeMember(boardId, userId);

      // Reload board data to get updated members
      await loadBoardData();
    } catch (error) {
      console.error('Error removing board member:', error);
      setError('Failed to remove member from board');
    }
  };

  const handleUpdateBoardMemberRole = async (userId: string, newRole: string) => {
    try {
      // Update member role through board API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await boardsApi.updateMemberRole(boardId, userId, newRole as any);

      // Reload board data to get updated members
      await loadBoardData();
    } catch (error) {
      console.error('Error updating board member role:', error);
      setError('Failed to update member role');
    }
  };

  // Get background style for the board
  const getBackgroundStyle = () => {
    if (!board.background) {
      return { backgroundColor: '#f8fafc' };
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

    return { backgroundColor: '#f8fafc' };
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Subtle Board Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={getBackgroundStyle()}
      />
      <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60" />

      {/* Minimalistic Board Header */}
      <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Board Info */}
            <div className="flex items-center gap-4">
              {/* Board Title with Visible Background Indicator */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-10 rounded-md flex-shrink-0 overflow-hidden"
                  style={
                    board.background?.startsWith('#')
                      ? { backgroundColor: board.background }
                      : board.background?.startsWith('http')
                      ? {
                          backgroundImage: `url(${board.background})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }
                      : { backgroundColor: '#17b6b2' }
                  }
                />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {board.name}
                </h1>

                {/* Star Button */}
                <button
                  onClick={handleStarBoard}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      board.isStarred
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-400 hover:text-amber-400'
                    }`}
                  />
                </button>
              </div>

              {/* Board Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{lists.length} {lists.length === 1 ? 'list' : 'lists'}</span>
                <span>•</span>
                <span>{Object.values(cards).flat().length} cards</span>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Team Members */}
            {board.members && board.members.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {board.members.slice(0, 4).map((member, index) => (
                    <div
                      key={member.userId?._id || `board-member-${index}`}
                      className="relative group"
                      title={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''} - ${member.role}`}
                    >
                      <div
                        className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-medium text-white shadow-sm"
                        style={{
                          backgroundColor: `hsl(${(index * 137.5) % 360}, 45%, 55%)`
                        }}
                      >
                        {member.userId?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.userId.avatar}
                            alt={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <>
                            {member.userId?.firstName?.charAt(0) || '?'}
                            {member.userId?.lastName?.charAt(0) || ''}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {board.members.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-300 text-xs font-medium">
                        +{board.members.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canManageMembers && (
              <button
                onClick={() => setShowMembersModal(true)}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Members</span>
              </button>
            )}

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-44 animate-in fade-in zoom-in-95 duration-150">
                  {canEditBoard && (
                    <button
                      onClick={handleEditBoard}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                      Edit Board
                    </button>
                  )}

                  {canDeleteBoard && (
                    <>
                      {canEditBoard && (
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                      )}
                      <button
                        onClick={handleDeleteBoard}
                        className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 text-sm text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Board
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Board Content - Lists */}
      <div className="relative flex-1 p-4 overflow-x-auto">
        <DragDropProvider
          lists={lists}
          cards={cards}
          onMoveCard={handleMoveCard}
          onMoveList={handleMoveList}
          onReorderCards={handleReorderCards}
        >
          <div className="flex gap-5 h-full min-h-0 pb-4">
            {lists.map((list) => (
              <SortableListContainer
                key={list._id}
                id={list._id}
                list={list}
                cards={cards[list._id] || []}
                onAddCard={handleAddCard}
                onEditList={handleEditList}
                onUpdateList={handleUpdateList}
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

      {/* Project Modal */}
      {selectedCard && (
        <ProjectModal
          card={selectedCard}
          isOpen={showCardModal}
          onClose={handleCloseCardModal}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
          canEdit={canEditBoard}
          canDelete={canDeleteBoard}
       boardMembers={board?.members?.map(member => ({
  _id: member.userId?._id || '',
  firstName: member.userId?.firstName || '',
  lastName: member.userId?.lastName || '',
  avatar: member.userId?.avatar,
  role: member.role
})) || []}
        />
      )}

      {/* Board Members Modal */}
      {board && (
        <BoardMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          boardId={boardId}
          boardTitle={board.name}
       currentMembers={board.members?.filter(member => member.userId).map(member => ({
  userId: member.userId!,
  role: member.role,
  joinedAt: member.joinedAt
})) || []}
          onAddMember={handleAddBoardMember}
          onRemoveMember={handleRemoveBoardMember}
          onUpdateMemberRole={handleUpdateBoardMemberRole}
          currentUserId={user?.id}
        />
      )}

      {/* Edit Board Modal */}
      {board && showEditModal && (
        <EditBoardModal
          board={board}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditBoardSubmit}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowErrorModal(false);
              setErrorMessage('');
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Permission Error
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                  }}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board Switcher Dock */}
      <BoardSwitcherDock
        currentBoardId={boardId}
        baseUrl={baseUrl}
        userRole={userRole}
      />
      </div>
  );
};

export default BoardView;