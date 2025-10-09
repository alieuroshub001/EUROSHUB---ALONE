'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BoardManagementProps } from '../types';
import { useBoardManagement } from '../hooks/useBoardManagement';
import { usePermissions } from '../hooks/usePermissions';
import BoardFilters from './BoardFilters';
import BoardGrid from './BoardGrid';
import CreateBoardModal from './CreateBoardModal';
import ConfirmDialog from '../shared/ConfirmDialog';

const BoardManagement: React.FC<BoardManagementProps> = ({ userRole, baseUrl }) => {
  const router = useRouter();
  const { user } = useAuth();
  
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    boardId: string;
    boardName: string;
  }>({
    show: false,
    boardId: '',
    boardName: '',
  });

  // Use custom hooks
  const {
    boards,
    filteredBoards,
    filters,
    loading,
    error,
    setFilters,
    createBoard,
    deleteBoard,
    archiveBoard,
    toggleStar,
    clearError,
  } = useBoardManagement();

  const permissions = usePermissions({ user, userRole });

  // Handlers
  const handleCreateBoard = async (data: { name: string; description?: string; background?: string }) => {
    try {
      await createBoard(data);
    } catch (err) {
      console.error('Failed to create board:', err);
      // Error is handled by the hook
    }
  };

  const handleViewBoard = (id: string) => {
    router.push(`${baseUrl}/boards/${id}`);
  };

  const handleEditBoard = (id: string) => {
    // TODO: Implement edit board modal
    console.log('Edit board:', id);
  };

  const handleDeleteBoard = (id: string) => {
    const board = boards.find(b => b._id === id);
    if (board) {
      setDeleteConfirm({
        show: true,
        boardId: id,
        boardName: board.name,
      });
    }
  };

  const confirmDeleteBoard = async () => {
    try {
      await deleteBoard(deleteConfirm.boardId);
      setDeleteConfirm({ show: false, boardId: '', boardName: '' });
    } catch (err) {
      console.error('Failed to delete board:', err);
      // Error is handled by the hook
    }
  };

  const handleArchiveBoard = async (id: string) => {
    try {
      await archiveBoard(id);
    } catch (err) {
      console.error('Failed to archive board:', err);
      // Error is handled by the hook
    }
  };

  const handleStarBoard = async (id: string) => {
    try {
      await toggleStar(id);
    } catch (err) {
      console.error('Failed to toggle star:', err);
      // Error is handled by the hook
    }
  };

  // Permission checks
  const canCreate = permissions.canEdit; // Assuming create permission follows edit permission
  const canEdit = permissions.canEdit;
  const canDelete = permissions.canDelete;
  const canArchive = permissions.canArchive;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header with Create Button */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Project Boards
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage and organize your projects with boards
              </p>
            </div>
            
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Board
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <BoardFilters
        filters={filters}
        onFiltersChange={setFilters}
        boardCount={boards.length}
        filteredCount={filteredBoards.length}
      />

      {/* Boards Grid */}
      <BoardGrid
        boards={filteredBoards}
        viewMode={filters.view}
        loading={loading.board}
        onCreateBoard={() => setShowCreateModal(true)}
        onViewBoard={handleViewBoard}
        onEditBoard={handleEditBoard}
        onDeleteBoard={handleDeleteBoard}
        onArchiveBoard={handleArchiveBoard}
        onStarBoard={handleStarBoard}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canArchive={canArchive}
      />

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error.message}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-3 text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBoard}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, boardId: '', boardName: '' })}
        onConfirm={confirmDeleteBoard}
        title="Delete Board"
        message={`Are you sure you want to delete "${deleteConfirm.boardName}"? This action cannot be undone and will permanently remove all lists, cards, and associated data.`}
        confirmText="Delete Board"
        variant="danger"
        isLoading={loading.deleting}
      />
    </div>
  );
};

export default BoardManagement;