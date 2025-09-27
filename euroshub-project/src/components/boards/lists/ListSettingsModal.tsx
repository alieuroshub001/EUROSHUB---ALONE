'use client';

import { useState, useEffect } from 'react';
import { X, Palette, Settings, Save, AlertCircle } from 'lucide-react';
import { ListData } from './ListContainer';

interface ListSettingsModalProps {
  list: ListData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateList: (listId: string, updates: Partial<ListData>) => Promise<void>;
}

const ListSettingsModal: React.FC<ListSettingsModalProps> = ({
  list,
  isOpen,
  onClose,
  onUpdateList,
}) => {
  const [editData, setEditData] = useState<Partial<ListData>>({
    name: list.name,
    color: list.color || '#6B7280',
    settings: {
      ...list.settings,
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset edit data when list changes
  useEffect(() => {
    setEditData({
      name: list.name,
      color: list.color || '#6B7280',
      settings: {
        ...list.settings,
      }
    });
    setError(null);
  }, [list]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!editData.name?.trim()) {
      setError('List name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onUpdateList(list._id, {
        name: editData.name.trim(),
        color: editData.color,
        settings: editData.settings,
      });
      onClose();
    } catch (err) {
      console.error('Error updating list:', err);
      setError(err instanceof Error ? err.message : 'Failed to update list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEditData({
      name: list.name,
      color: list.color || '#6B7280',
      settings: {
        ...list.settings,
      }
    });
    setError(null);
    onClose();
  };

  const predefinedColors = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#84CC16', // Lime
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              List Settings
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* List Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Name
            </label>
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter list name..."
              disabled={isLoading}
            />
          </div>

          {/* List Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Color
            </label>

            {/* Color Preview */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: editData.color }}
                title="Current color"
              />
              <input
                type="color"
                value={editData.color || '#6B7280'}
                onChange={(e) => setEditData(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-8 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {editData.color}
              </span>
            </div>

            {/* Predefined Colors */}
            <div className="grid grid-cols-5 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                    editData.color === color
                      ? 'border-gray-900 dark:border-gray-100 scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* WIP Limit Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Work in Progress (WIP) Limit
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="wipEnabled"
                  checked={editData.settings?.wipLimit?.enabled || false}
                  onChange={(e) => setEditData(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      wipLimit: {
                        ...prev.settings?.wipLimit,
                        enabled: e.target.checked,
                        limit: prev.settings?.wipLimit?.limit || 5
                      }
                    }
                  }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  disabled={isLoading}
                />
                <label htmlFor="wipEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                  Enable WIP limit
                </label>
              </div>

              {editData.settings?.wipLimit?.enabled && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Maximum number of cards
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editData.settings?.wipLimit?.limit || 5}
                    onChange={(e) => setEditData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        wipLimit: {
                          ...prev.settings?.wipLimit,
                          enabled: prev.settings?.wipLimit?.enabled || false,
                          limit: parseInt(e.target.value) || 5
                        }
                      }
                    }))}
                    className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !editData.name?.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListSettingsModal;