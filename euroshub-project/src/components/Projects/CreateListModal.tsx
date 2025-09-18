'use client';

import { useState } from 'react';
import { X, List, Palette } from 'lucide-react';
import { CreateListData } from '@/types/project';

interface CreateListModalProps {
  onClose: () => void;
  onSubmit: (listData: CreateListData) => void;
  boardTitle: string;
}

const listTypes = [
  { value: 'todo', label: 'To Do', description: 'Tasks that need to be started' },
  { value: 'in_progress', label: 'In Progress', description: 'Tasks currently being worked on' },
  { value: 'review', label: 'Review', description: 'Tasks pending review or approval' },
  { value: 'done', label: 'Done', description: 'Completed tasks' },
  { value: 'custom', label: 'Custom', description: 'Create a custom list type' }
];

const colorOptions = [
  '#6B7280', // Gray
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#8B5A2B'  // Brown
];

const CreateListModal = ({ onClose, onSubmit, boardTitle }: CreateListModalProps) => {
  const [formData, setFormData] = useState<CreateListData>({
    title: '',
    description: '',
    color: '#6B7280',
    listType: 'todo'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'List title is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const submitData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined
      };

      onSubmit(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleTypeSelect = (listType: string) => {
    const selectedType = listTypes.find(t => t.value === listType);
    setFormData(prev => ({
      ...prev,
      listType: listType as any,
      title: selectedType && listType !== 'custom' ? selectedType.label : prev.title
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-600 flex items-center justify-center">
              <List className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New List</h2>
              <p className="text-sm text-gray-500">Adding to board: {boardTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* List Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              List Type
            </label>
            <div className="grid grid-cols-1 gap-3">
              {listTypes.map((type) => (
                <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="listType"
                    value={type.value}
                    checked={formData.listType === type.value}
                    onChange={() => handleTypeSelect(type.value)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* List Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              List Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., To Do, In Progress, Done"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* List Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what tasks belong in this list..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Palette size={16} className="inline mr-1" />
              List Color
            </label>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                    formData.color === color
                      ? 'border-gray-800 scale-110 shadow-md'
                      : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm text-gray-600">Selected: {formData.color}</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-xs">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: formData.color }}
                  />
                  <h3 className="font-semibold text-gray-900">
                    {formData.title || 'List Title'}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                    0
                  </span>
                </div>
                {formData.description && (
                  <p className="mt-2 text-sm text-gray-600">{formData.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              disabled={!formData.title.trim()}
            >
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListModal;