'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface CreateListFormProps {
  boardId: string;
  onCreateList: (boardId: string, name: string) => Promise<void>;
  onCancel?: () => void;
}

const CreateListForm: React.FC<CreateListFormProps> = ({
  boardId,
  onCreateList,
  onCancel,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [listName, setListName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartCreating = () => {
    setIsCreating(true);
    setListName('');
  };

  const handleCancel = () => {
    setIsCreating(false);
    setListName('');
    onCancel?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!listName.trim()) return;

    setIsLoading(true);
    try {
      await onCreateList(boardId, listName.trim());
      setListName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating list:', error);
      // Error handling is now done in the parent component (BoardView)
      // which will show the error modal to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isCreating) {
    return (
      <div className="w-80 flex-shrink-0">
        <button
          onClick={handleStartCreating}
          className="w-full p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add another list
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <input
          type="text"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter list title..."
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#17b6b2] focus:border-transparent transition-colors"
          autoFocus
          disabled={isLoading}
        />

        <div className="flex items-center gap-2 mt-3">
          <button
            type="submit"
            disabled={!listName.trim() || isLoading}
            className="px-4 py-2 bg-[#17b6b2] hover:bg-[#15a09d] disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            {isLoading ? 'Adding...' : 'Add list'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateListForm;