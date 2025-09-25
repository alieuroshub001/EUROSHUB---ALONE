'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface CreateListFormProps {
  boardId: string;
  onCreateList: (boardId: string, name: string) => void;
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
      // TODO: Show error message to user
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
          className="w-full p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600"
        >
          <Plus className="w-4 h-4" />
          Add another list
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0">
      <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <input
          type="text"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter list title..."
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
          disabled={isLoading}
        />

        <div className="flex items-center gap-2 mt-3">
          <button
            type="submit"
            disabled={!listName.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            {isLoading ? 'Adding...' : 'Add list'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateListForm;