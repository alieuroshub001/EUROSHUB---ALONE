'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface BoardStats {
  boardId: string;
  listsCount: number;
  cardsCount: number;
  lastUpdated: number;
}

interface BoardStatsContextType {
  boardsStats: Map<string, BoardStats>;
  updateBoardStats: (boardId: string, listsCount: number, cardsCount: number) => void;
  getBoardStats: (boardId: string) => BoardStats | undefined;
  clearBoardStats: (boardId: string) => void;
}

const BoardStatsContext = createContext<BoardStatsContextType | undefined>(undefined);

export const BoardStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boardsStats, setBoardsStats] = useState<Map<string, BoardStats>>(new Map());

  const updateBoardStats = useCallback((boardId: string, listsCount: number, cardsCount: number) => {
    setBoardsStats(prev => {
      // Check if stats actually changed to avoid unnecessary updates
      const existingStats = prev.get(boardId);
      if (existingStats &&
          existingStats.listsCount === listsCount &&
          existingStats.cardsCount === cardsCount) {
        return prev; // No change, return same state
      }

      const newMap = new Map(prev);
      const newStats = {
        boardId,
        listsCount,
        cardsCount,
        lastUpdated: Date.now()
      };

      newMap.set(boardId, newStats);

      // Store in localStorage for persistence
      try {
        localStorage.setItem(`board-stats-${boardId}`, JSON.stringify({
          listsCount,
          cardsCount,
          lastUpdated: Date.now()
        }));
      } catch (error) {
        console.error('Failed to save board stats to localStorage:', error);
      }

      console.log('✅ BoardStats updated:', { boardId, listsCount, cardsCount });
      return newMap;
    });
  }, []);

  const getBoardStats = useCallback((boardId: string) => {
    return boardsStats.get(boardId);
  }, [boardsStats]);

  const clearBoardStats = useCallback((boardId: string) => {
    setBoardsStats(prev => {
      const newMap = new Map(prev);
      newMap.delete(boardId);

      // Remove from localStorage
      try {
        localStorage.removeItem(`board-stats-${boardId}`);
      } catch (error) {
        console.error('Failed to remove board stats from localStorage:', error);
      }

      return newMap;
    });
  }, []);

  // Load initial stats from localStorage
  useEffect(() => {
    const loadStatsFromStorage = () => {
      const newMap = new Map<string, BoardStats>();

      try {
        // Find all board stats in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('board-stats-')) {
            const boardId = key.replace('board-stats-', '');
            const statsStr = localStorage.getItem(key);
            if (statsStr) {
              const stats = JSON.parse(statsStr);
              newMap.set(boardId, {
                boardId,
                listsCount: stats.listsCount,
                cardsCount: stats.cardsCount,
                lastUpdated: stats.lastUpdated
              });
            }
          }
        }

        if (newMap.size > 0) {
          setBoardsStats(newMap);
        }
      } catch (error) {
        console.error('Failed to load board stats from localStorage:', error);
      }
    };

    loadStatsFromStorage();
  }, []);

  return (
    <BoardStatsContext.Provider value={{ boardsStats, updateBoardStats, getBoardStats, clearBoardStats }}>
      {children}
    </BoardStatsContext.Provider>
  );
};

export const useBoardStats = () => {
  const context = useContext(BoardStatsContext);
  if (!context) {
    throw new Error('useBoardStats must be used within a BoardStatsProvider');
  }
  return context;
};
