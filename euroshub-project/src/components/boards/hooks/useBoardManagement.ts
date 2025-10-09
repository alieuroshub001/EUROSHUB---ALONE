import { useState, useEffect, useCallback } from 'react';
import { Board, BoardFilters, BoardError, LoadingStates, CreateBoardData } from '../types';
import { boardsApi } from '@/services/trelloBoardsApi';

interface UseBoardManagementReturn {
  // State
  boards: Board[];
  filteredBoards: Board[];
  filters: BoardFilters;
  loading: LoadingStates;
  error: BoardError | null;
  
  // Actions
  setFilters: (filters: Partial<BoardFilters>) => void;
  loadBoards: () => Promise<void>;
  createBoard: (data: CreateBoardData) => Promise<void>;
  updateBoard: (id: string, data: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  archiveBoard: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBoardManagement = (): UseBoardManagementReturn => {
  // State
  const [boards, setBoards] = useState<Board[]>([]);
  const [filters, setFiltersState] = useState<BoardFilters>({
    search: '',
    filter: 'all',
    sort: 'updated',
    view: 'grid'
  });
  const [loading, setLoading] = useState<LoadingStates>({
    board: false,
    lists: false,
    cards: false,
    creating: false,
    updating: false,
    deleting: false,
  });
  const [error, setError] = useState<BoardError | null>(null);

  // Filter boards based on current filters
  const filteredBoards = boards.filter(board => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matchesName = board.name.toLowerCase().includes(searchTerm);
      const matchesDescription = board.description?.toLowerCase().includes(searchTerm);
      if (!matchesName && !matchesDescription) return false;
    }

    // Type filter
    switch (filters.filter) {
      case 'starred':
        return board.isStarred;
      case 'recent':
        // Show boards updated in last 7 days
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(board.updatedAt) > lastWeek;
      case 'archived':
        // TODO: Add archived property to Board type when backend supports it
        return false;
      default:
        return true;
    }
  }).sort((a, b) => {
    // Sort logic
    switch (filters.sort) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'activity':
        // TODO: Implement activity-based sorting when backend supports it
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return 0;
    }
  });

  // Actions
  const setFilters = useCallback((newFilters: Partial<BoardFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, board: true }));
      setError(null);
      
      const boardsData = await boardsApi.getBoards();
      // Transform API response to ensure user objects have both id and _id
      const transformedBoards = boardsData.map(board => ({
        ...board,
        createdBy: board.createdBy ? {
          ...board.createdBy,
          id: board.createdBy.id || board.createdBy._id
        } : undefined,
        members: board.members?.map(member => ({
          ...member,
          userId: member.userId ? {
            ...member.userId,
            id: member.userId.id || member.userId._id
          } : undefined
        }))
      }));
      setBoards(transformedBoards);
    } catch (err) {
      console.error('Error loading boards:', err);
      setError({
        type: 'network',
        message: err instanceof Error ? err.message : 'Failed to load boards',
        details: err
      });
    } finally {
      setLoading(prev => ({ ...prev, board: false }));
    }
  }, []);

  const createBoard = useCallback(async (data: CreateBoardData) => {
    try {
      setLoading(prev => ({ ...prev, creating: true }));
      setError(null);
      
      const newBoard = await boardsApi.createBoard(data);
      // Transform API response to ensure user objects have both id and _id
      const transformedBoard = {
        ...newBoard,
        createdBy: newBoard.createdBy ? {
          ...newBoard.createdBy,
          id: newBoard.createdBy.id || newBoard.createdBy._id
        } : undefined,
        members: newBoard.members?.map(member => ({
          ...member,
          userId: member.userId ? {
            ...member.userId,
            id: member.userId.id || member.userId._id
          } : undefined
        }))
      };
      setBoards(prev => [transformedBoard, ...prev]);
    } catch (err) {
      console.error('Error creating board:', err);
      setError({
        type: 'validation',
        message: err instanceof Error ? err.message : 'Failed to create board',
        details: err
      });
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  }, []);

  const updateBoard = useCallback(async (id: string, data: Partial<Board>) => {
    try {
      setLoading(prev => ({ ...prev, updating: true }));
      setError(null);
      
      const updatedBoard = await boardsApi.updateBoard(id, data);
      // Transform API response to ensure user objects have both id and _id
      const transformedBoard = {
        ...updatedBoard,
        createdBy: updatedBoard.createdBy ? {
          ...updatedBoard.createdBy,
          id: updatedBoard.createdBy.id || updatedBoard.createdBy._id
        } : undefined,
        members: updatedBoard.members?.map(member => ({
          ...member,
          userId: member.userId ? {
            ...member.userId,
            id: member.userId.id || member.userId._id
          } : undefined
        }))
      };
      setBoards(prev => prev.map(board => 
        board._id === id ? { ...board, ...transformedBoard } : board
      ));
    } catch (err) {
      console.error('Error updating board:', err);
      setError({
        type: 'validation',
        message: err instanceof Error ? err.message : 'Failed to update board',
        details: err
      });
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, updating: false }));
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      setLoading(prev => ({ ...prev, deleting: true }));
      setError(null);
      
      await boardsApi.deleteBoard(id);
      setBoards(prev => prev.filter(board => board._id !== id));
    } catch (err) {
      console.error('Error deleting board:', err);
      setError({
        type: 'general',
        message: err instanceof Error ? err.message : 'Failed to delete board',
        details: err
      });
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, []);

  const archiveBoard = useCallback(async (id: string) => {
    try {
      setLoading(prev => ({ ...prev, updating: true }));
      setError(null);
      
      // TODO: Implement archive API when backend supports it
      await boardsApi.updateBoard(id, { /* archived: true */ });
      // For now, just remove from list
      setBoards(prev => prev.filter(board => board._id !== id));
    } catch (err) {
      console.error('Error archiving board:', err);
      setError({
        type: 'general',
        message: err instanceof Error ? err.message : 'Failed to archive board',
        details: err
      });
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, updating: false }));
    }
  }, []);

  const toggleStar = useCallback(async (id: string) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setBoards(prev => prev.map(board => 
        board._id === id ? { ...board, isStarred: !board.isStarred } : board
      ));

      // Call API
      const result = await boardsApi.toggleStar(id);
      
      // Update with server response
      setBoards(prev => prev.map(board => 
        board._id === id ? { ...board, isStarred: result.isStarred } : board
      ));
    } catch (err) {
      console.error('Error toggling star:', err);
      
      // Revert optimistic update
      setBoards(prev => prev.map(board => 
        board._id === id ? { ...board, isStarred: !board.isStarred } : board
      ));
      
      setError({
        type: 'general',
        message: err instanceof Error ? err.message : 'Failed to update star status',
        details: err
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  return {
    boards,
    filteredBoards,
    filters,
    loading,
    error,
    setFilters,
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    archiveBoard,
    toggleStar,
    clearError,
  };
};