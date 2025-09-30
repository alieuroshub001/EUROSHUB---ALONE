'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Users,
  Settings,
  MoreVertical,
  Archive,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ListData, Card } from './lists/ListContainer';
import SortableListContainer from './lists/SortableListContainer';
import CreateListForm from './lists/CreateListForm';
import ProjectModal from './cards/ProjectModal';
import DragDropProvider from './DragDropProvider';
import { Board, UserRole } from './BoardManagement';
import { boardsApi, listsApi, cardsApi } from '@/services/trelloBoardsApi';
import BoardSwitcherDock from './BoardSwitcherDock';
import BoardMembersModal from './BoardMembersModal';

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
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Permission checks
  const getCurrentUserBoardRole = () => {
    if (!user || !board) return null;
    const member = board.members.find(m => m.userId._id === user.id);
    return member?.role || null;
  };

  const currentUserBoardRole = getCurrentUserBoardRole();
  const canEditBoard = ['superadmin', 'admin'].includes(userRole) ||
                      board?.createdBy._id === user?.id ||
                      ['owner', 'admin', 'editor'].includes(currentUserBoardRole || '');
  const canDeleteBoard = ['superadmin', 'admin'].includes(userRole) ||
                         board?.createdBy._id === user?.id ||
                         currentUserBoardRole === 'owner';
  const canCreateLists = ['superadmin', 'admin', 'hr', 'employee'].includes(userRole) ||
                        ['owner', 'admin', 'editor'].includes(currentUserBoardRole || '');
  const canManageMembers = ['superadmin', 'admin'].includes(userRole) ||
                          board?.createdBy._id === user?.id ||
                          ['owner', 'admin'].includes(currentUserBoardRole || '');

  // Load board data
  useEffect(() => {
    loadBoardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } catch (err) {
        console.error('Error updating star status:', err);
        // Revert on error
        setBoard(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
        setError(err instanceof Error ? err.message : 'Failed to update star status');
      }
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
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to create list';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission') || errorMsg.includes('create lists');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to create lists in this board');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        console.error('Error creating list:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
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
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to create card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to create cards in this list');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        console.error('Error creating card:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
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
    } catch (err) {
      console.error('Error updating list:', err);
      setError(err instanceof Error ? err.message : 'Failed to update list');
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

      // Update local state to remove the list and its cards
      setLists(lists.filter(list => list._id !== listId));
      const newCards = { ...cards };
      delete newCards[listId];
      setCards(newCards);

      console.log('Deleted list:', listId);
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete list';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to delete this list');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        console.error('Error deleting list:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }

      // Only set general error state for non-permission errors
      if (!errorMsg.includes('permission') && !errorMsg.includes('not have permission')) {
        setError(errorMsg);
      }
    }
  };

  const handleArchiveList = async (listId: string) => {
    try {
      // Call backend API to archive the list
      const result = await listsApi.archiveList(listId);

      // Update local state to mark the list as archived
      setLists(lists.map(list =>
        list._id === listId
          ? { ...list, isArchived: result.isArchived }
          : list
      ));

      console.log('Archived list:', listId, result.isArchived);
    } catch (err) {
      console.error('Error archiving list:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive list');
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
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to update card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to update this card');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        console.error('Error updating card:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }

      // Only set general error state for non-permission errors
      if (!errorMsg.includes('permission') && !errorMsg.includes('not have permission')) {
        setError(errorMsg);
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
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
    } catch (err) {
      // Check if it's a permission error
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete card';
      const isPermissionError = errorMsg.includes('permission') || errorMsg.includes('not have permission');

      if (isPermissionError) {
        // For permission errors, only show the modal - no console logging
        setErrorMessage('You do not have permission to delete this card');
        setShowErrorModal(true);
      } else {
        // For other errors, log to console and show modal
        console.error('Error deleting card:', err);
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
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

  // Extract primary color for scrollbar styling
  const primaryColor = board.background?.startsWith('#')
    ? board.background
    : '#6366f1';

  // Create hover color for scrollbar
  const getHoverColor = (color: string) => {
    if (color.startsWith('#')) {
      // For hex colors, create a darker version
      const hex = color.substring(1);
      const num = parseInt(hex, 16);
      const amt = -20;
      const R = (num >> 16) + amt;
      const G = (num >> 8 & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    return color;
  };

  // Create dynamic scrollbar styles
  const scrollbarStyle = {
    '--scrollbar-thumb': primaryColor,
    '--scrollbar-track': `${primaryColor}20`,
    '--scrollbar-thumb-hover': getHoverColor(primaryColor),
  } as React.CSSProperties;

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

  return (
    <div className="h-full flex flex-col" style={backgroundStyle}>
      {/* Ultra-Modern Board Header */}
      <div className="relative">
        {/* Header Background with Glass Effect */}
        <div className="absolute inset-0 backdrop-blur-xl bg-gradient-to-r from-black/40 via-black/30 to-black/40 border-b border-white/10"></div>

        {/* Header Content */}
        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-6">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="group p-3 hover:bg-white/15 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/10 hover:border-white/20"
              >
                <ArrowLeft className="w-5 h-5 text-white/90 group-hover:text-white transition-colors duration-200" />
              </button>

              {/* Board Info */}
              <div className="flex items-center gap-4">
                {/* Board Title with Gradient */}
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent tracking-tight">
                    {board.name}
                  </h1>

                  {/* Star Button with Enhanced Animation */}
                  <button
                    onClick={handleStarBoard}
                    className="group p-2 hover:bg-white/15 rounded-xl transition-all duration-300"
                  >
                    <Star
                      className={`w-6 h-6 transition-all duration-300 ${
                        board.isStarred
                          ? 'fill-yellow-400 text-yellow-400 scale-110'
                          : 'text-white/70 hover:text-yellow-300 group-hover:scale-110'
                      }`}
                    />
                  </button>
                </div>

                {/* Board Stats Badges */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="text-xs font-medium text-white/90">
                      {lists.length} {lists.length === 1 ? 'List' : 'Lists'}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="text-xs font-medium text-white/90">
                      {Object.values(cards).flat().length} Cards
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Enhanced Members Section */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white/70 hidden sm:block">Team</span>
                <div className="flex -space-x-2">
                  {board.members.slice(0, 5).map((member, index) => (
                    <div
                      key={member.userId?._id || `board-member-${index}`}
                      className="relative group"
                    >
                      <div className="w-15 h-15 rounded-full bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-sm font-semibold shadow-xl hover:scale-110 hover:z-10 transition-all duration-300 cursor-pointer">
                        {member.userId?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.userId.avatar}
                            alt={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">
                            {member.userId?.firstName?.charAt(0) || '?'}{member.userId?.lastName?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>

                      {/* Enhanced Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                        {member.userId?.firstName || ''} {member.userId?.lastName || ''}
                        <div className="text-xs text-white/70 capitalize">{member.role}</div>
                      </div>
                    </div>
                  ))}
                  {board.members.length > 5 && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-sm font-bold shadow-xl hover:scale-110 transition-all duration-300 cursor-pointer">
                      <span className="text-white">+{board.members.length - 5}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex items-center gap-2">
                {canManageMembers && (
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="group px-4 py-2.5 bg-white/15 backdrop-blur-sm hover:bg-white/25 rounded-2xl flex items-center gap-2 text-sm font-medium transition-all duration-300 border border-white/20 hover:border-white/30 hover:shadow-lg"
                  >
                    <Users className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                    <span className="hidden sm:inline text-white/90">Members</span>
                  </button>
                )}

              </div>

              {/* Enhanced Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="group p-3 bg-white/15 backdrop-blur-sm hover:bg-white/25 rounded-2xl transition-all duration-300 border border-white/20 hover:border-white/30 hover:shadow-lg"
                >
                  <MoreVertical className="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform duration-200" />
                </button>

                {/* Enhanced Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-16 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 py-2 z-50 min-w-56 animate-in slide-in-from-top-2 duration-200">
                    {canEditBoard && (
                      <>
                        <button className="group w-full px-4 py-3 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/50 flex items-center gap-3 text-sm text-gray-900 dark:text-white transition-all duration-200 hover:translate-x-1">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors duration-200">
                            <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium">Board Settings</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Configure board preferences</div>
                          </div>
                        </button>

                        <button className="group w-full px-4 py-3 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/50 flex items-center gap-3 text-sm text-gray-900 dark:text-white transition-all duration-200 hover:translate-x-1">
                          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors duration-200">
                            <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <div className="font-medium">Archive Board</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Hide from workspace</div>
                          </div>
                        </button>

                        {canDeleteBoard && (
                          <div className="mx-2 my-2 border-t border-gray-200/50 dark:border-gray-700/50"></div>
                        )}
                      </>
                    )}

                    {canDeleteBoard && (
                      <button className="group w-full px-4 py-3 text-left hover:bg-red-50/80 dark:hover:bg-red-900/20 flex items-center gap-3 text-sm transition-all duration-200 hover:translate-x-1">
                        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors duration-200">
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <div className="font-medium text-red-600 dark:text-red-400">Delete Board</div>
                          <div className="text-xs text-red-500/70 dark:text-red-400/70">Permanently remove board</div>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Modern Board Content - Lists */}
      <div
        className="flex-1 p-6 overflow-x-auto bg-black/5 custom-scrollbar-horizontal"
        style={scrollbarStyle}
      >
        <DragDropProvider
          lists={lists}
          cards={cards}
          onMoveCard={handleMoveCard}
          onMoveList={handleMoveList}
          onReorderCards={handleReorderCards}
        >
          <div className="flex gap-6 h-full min-h-0">
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
            _id: member.userId._id,
            firstName: member.userId.firstName,
            lastName: member.userId.lastName,
            avatar: member.userId.avatar,
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
          currentMembers={board.members.map(member => ({
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt
          }))}
          onAddMember={handleAddBoardMember}
          onRemoveMember={handleRemoveBoardMember}
          onUpdateMemberRole={handleUpdateBoardMemberRole}
          currentUserId={user?.id}
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
      />
      </div>
  );
};

export default BoardView;