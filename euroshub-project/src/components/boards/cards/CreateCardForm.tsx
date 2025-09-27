'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateCardFormProps {
  listId: string;
  onCreateCard: (listId: string, cardData: CreateCardData) => Promise<void>;
  onCancel: () => void;
}

export interface CreateCardData {
  title: string;
  description?: string;
  coverImage?: string;
  color?: string;
  labels?: string[];
  dueDate?: Date;
  assignedMembers?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

const CreateCardForm: React.FC<CreateCardFormProps> = ({
  listId,
  onCreateCard,
  onCancel,
}) => {
  const [cardData, setCardData] = useState<CreateCardData>({
    title: '',
    description: '',
    labels: [],
    assignedMembers: [],
    priority: 'medium'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardData.title.trim()) return;

    setIsLoading(true);
    try {
      await onCreateCard(listId, {
        ...cardData,
        title: cardData.title.trim(),
        description: cardData.description?.trim() || undefined
      });

      // Reset form
      setCardData({
        title: '',
        description: '',
        labels: [],
        assignedMembers: [],
        priority: 'medium'
      });
      setShowAdvanced(false);
    } catch (error) {
      console.error('Error creating card:', error);
      // TODO: Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCardData({
      title: '',
      description: '',
      labels: [],
      assignedMembers: [],
      priority: 'medium'
    });
    setShowAdvanced(false);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const addLabel = (label: string) => {
    if (label.trim() && !cardData.labels?.includes(label.trim())) {
      setCardData(prev => ({
        ...prev,
        labels: [...(prev.labels || []), label.trim()]
      }));
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setCardData(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove) || []
    }));
  };

  const predefinedLabels = ['Frontend', 'Backend', 'Design', 'Bug', 'Feature', 'Urgent', 'Testing'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <input
            type="text"
            value={cardData.title}
            onChange={(e) => setCardData(prev => ({ ...prev, title: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder="Enter card title..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <textarea
            value={cardData.description}
            onChange={(e) => setCardData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Add a description..."
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          disabled={isLoading}
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={cardData.priority}
                onChange={(e) => setCardData(prev => ({
                  ...prev,
                  priority: e.target.value as CreateCardData['priority']
                }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                onChange={(e) => setCardData(prev => ({
                  ...prev,
                  dueDate: e.target.value ? new Date(e.target.value) : undefined
                }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labels
              </label>

              {/* Current Labels */}
              {cardData.labels && cardData.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {cardData.labels.map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                        disabled={isLoading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Predefined Labels */}
              <div className="flex flex-wrap gap-1">
                {predefinedLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => addLabel(label)}
                    disabled={cardData.labels?.includes(label) || isLoading}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      cardData.labels?.includes(label)
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={cardData.color || '#ffffff'}
                  onChange={(e) => setCardData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-8 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
                  title="Choose card color"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setCardData(prev => ({ ...prev, color: undefined }))}
                  className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                  disabled={isLoading}
                >
                  Default
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {cardData.color || 'Default'}
                </span>
              </div>
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cover Image URL
              </label>
              <input
                type="url"
                value={cardData.coverImage || ''}
                onChange={(e) => setCardData(prev => ({ ...prev, coverImage: e.target.value || undefined }))}
                placeholder="https://example.com/image.jpg"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={!cardData.title.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            {isLoading ? 'Creating...' : 'Create Card'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCardForm;