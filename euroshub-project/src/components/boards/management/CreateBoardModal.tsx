import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus } from 'lucide-react';
import { CreateBoardData } from '../types';
import { boardsApi } from '@/services/trelloBoardsApi';

interface CreateBoardModalProps {
  onClose: () => void;
  onSubmit: (data: CreateBoardData) => Promise<void> | void;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    background: '#6366f1'
  });
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const popularColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f59e0b', '#10b981', '#14b8a6', '#3b82f6',
    '#06b6d4', '#84cc16', '#a855f7', '#ef4444'
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);

      // Upload to server to get HTTP URL
      setUploadingImage(true);
      try {
        const data = await boardsApi.uploadBackgroundImage(file);
        if (data.url) {
          // Set the Cloudinary URL as background
          setFormData(prev => ({ ...prev, background: data.url }));
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
        setImageFile(null);
        setImagePreview('');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error creating board:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Board</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up a new board to organize your work</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Board Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Product Roadmap, Marketing Campaign"
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What's this board about?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Background Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Board Background
            </label>

            {/* Background Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setBackgroundType('color')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  backgroundType === 'color'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Color
              </button>
              <button
                type="button"
                onClick={() => setBackgroundType('image')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  backgroundType === 'image'
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Image
              </button>
            </div>

            {/* Color Picker */}
            {backgroundType === 'color' && (
              <div className="space-y-3">
                <div className="grid grid-cols-6 gap-2">
                  {popularColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, background: color })}
                      className={`aspect-square rounded-md transition-all hover:scale-105 border-2 ${
                        formData.background === color ? 'border-gray-900 dark:border-gray-100 scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.background.startsWith('#') ? formData.background : '#6366f1'}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    className="w-16 h-10 rounded-md cursor-pointer border border-gray-300 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={formData.background.startsWith('#') ? formData.background : '#6366f1'}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Image Upload */}
            {backgroundType === 'image' && (
              <div>
                <label className="block w-full cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    uploadingImage ? 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800' :
                    imagePreview
                      ? 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}>
                    {uploadingImage ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-gray-400 border-t-gray-900 dark:border-t-gray-100 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading image...</p>
                      </div>
                    ) : imagePreview ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="mx-auto h-32 rounded-md object-cover" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload background image</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div
              className="h-24 rounded-lg relative overflow-hidden border border-gray-200 dark:border-gray-700"
              style={
                formData.background.startsWith('#')
                  ? { backgroundColor: formData.background }
                  : {
                      backgroundImage: `url(${formData.background})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }
              }
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="absolute bottom-3 left-4">
                <h3 className="font-semibold text-white text-base" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {formData.name || 'Board Name'}
                </h3>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateBoardModal;