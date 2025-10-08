import React from 'react';
import { Plus } from 'lucide-react';
import { Board, ViewMode } from '../types';
import BoardCard from './BoardCard';
import LoadingSpinner from '../shared/LoadingSpinner';

interface BoardGridProps {
  boards: Board[];
  viewMode: ViewMode;
  loading: boolean;
  onCreateBoard: () => void;
  onViewBoard: (id: string) => void;
  onEditBoard: (id: string) => void;
  onDeleteBoard: (id: string) => void;
  onArchiveBoard: (id: string) => void;
  onStarBoard: (id: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canArchive: boolean;
}

const BoardGrid: React.FC<BoardGridProps> = ({
  boards,
  viewMode,
  loading,
  onCreateBoard,
  onViewBoard,
  onEditBoard,
  onDeleteBoard,
  onArchiveBoard,
  onStarBoard,
  canCreate,
  canEdit,
  canDelete,
  canArchive,
}) => {
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading boards..." />
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Plus className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No boards found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {boards.length === 0 
            ? "Get started by creating your first board to organize your projects and tasks."
            : "No boards match your current filters. Try adjusting your search terms or filters."
          }
        </p>
        {canCreate && (
          <button
            onClick={onCreateBoard}
            className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Board
          </button>
        )}
      </div>
    );
  }

  const gridClasses = viewMode === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'space-y-4';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Create Board Card (if can create) */}
      {canCreate && (
        <div className={gridClasses}>
          <button
            onClick={onCreateBoard}
            className={`group relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-lg ${
              viewMode === 'grid' ? 'h-64' : 'h-32'
            } flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200`}
          >
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium mb-1">Create New Board</h3>
            <p className="text-sm text-center px-4">
              Set up a new board to organize your work
            </p>
          </button>

          {/* Boards */}
          {boards.map((board) => (
            <BoardCard
              key={board._id}
              board={board}
              onView={onViewBoard}
              onEdit={onEditBoard}
              onDelete={onDeleteBoard}
              onArchive={onArchiveBoard}
              onStar={onStarBoard}
              canEdit={canEdit}
              canDelete={canDelete}
              canArchive={canArchive}
            />
          ))}
        </div>
      )}

      {/* If can't create, just show boards */}
      {!canCreate && (
        <div className={gridClasses}>
          {boards.map((board) => (
            <BoardCard
              key={board._id}
              board={board}
              onView={onViewBoard}
              onEdit={onEditBoard}
              onDelete={onDeleteBoard}
              onArchive={onArchiveBoard}
              onStar={onStarBoard}
              canEdit={canEdit}
              canDelete={canDelete}
              canArchive={canArchive}
            />
          ))}
        </div>
      )}

      {/* List View Table (when viewMode is 'list') */}
      {viewMode === 'list' && boards.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Board
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lists
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cards
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {boards.map((board) => (
                  <tr key={board._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-12 h-8 rounded-md mr-4 flex-shrink-0"
                          style={
                            board.background?.startsWith('#')
                              ? { backgroundColor: board.background }
                              : {
                                  backgroundImage: `url(${board.background})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }
                          }
                        />
                        <div>
                          <button
                            onClick={() => onViewBoard(board._id)}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                          >
                            {board.name}
                          </button>
                          {board.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {board.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-1">
                        {board.members?.slice(0, 3).map((member, index) => (
                          <div
                            key={member.userId?._id || `member-${index}`}
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center"
                            title={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                          >
                            {member.userId?.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.userId.avatar}
                                alt={`${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-[8px] font-semibold">
                                {member.userId?.firstName?.charAt(0) || '?'}{member.userId?.lastName?.charAt(0) || ''}
                              </span>
                            )}
                          </div>
                        ))}
                        {board.members && board.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                            <span className="text-gray-600 dark:text-gray-300 text-[8px] font-semibold">
                              +{board.members.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {board.listsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {board.cardsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onViewBoard(board._id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardGrid;