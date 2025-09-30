'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Clock,
  Archive,
  Copy,
  Trash2,
  Edit3,
  Save,
  UserPlus
} from 'lucide-react';
import Image from 'next/image';
import { Card } from '../lists/ListContainer';

interface EditCardModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCard: (cardId: string, updates: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}

interface Comment {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  content: string;
  createdAt: Date;
}

const EditCardModal: React.FC<EditCardModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdateCard,
  onDeleteCard,
  canEdit,
  canDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Card>>(card);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset edit data when card changes
  useEffect(() => {
    setEditData(card);
    setIsEditing(false);

    // Load comments for this card
    // TODO: Replace with actual API call
    setComments([
      {
        _id: '1',
        userId: {
          _id: '1',
          firstName: 'John',
          lastName: 'Doe'
        },
        content: 'This looks great! Can we add more details to the requirements?',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        _id: '2',
        userId: {
          _id: '2',
          firstName: 'Jane',
          lastName: 'Smith'
        },
        content: 'Working on the mockups now. Will have them ready by tomorrow.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      }
    ]);
  }, [card]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdateCard(card._id, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating card:', error);
      // TODO: Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData(card);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await onDeleteCard(card._id);
        onClose();
      } catch (error) {
        console.error('Error deleting card:', error);
        // TODO: Show error message
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // TODO: Add comment via API
    const comment: Comment = {
      _id: `comment_${Date.now()}`,
      userId: {
        _id: '1', // Current user ID
        firstName: 'Current',
        lastName: 'User'
      },
      content: newComment.trim(),
      createdAt: new Date()
    };

    setComments([...comments, comment]);
    setNewComment('');
  };

  const addLabel = (label: string) => {
    if (label.trim() && !editData.labels?.includes(label.trim())) {
      setEditData(prev => ({
        ...prev,
        labels: [...(prev.labels || []), label.trim()]
      }));
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove) || []
    }));
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const predefinedLabels = ['Frontend', 'Backend', 'Design', 'Bug', 'Feature', 'Urgent', 'Testing'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Card' : 'Card Details'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={isLoading}
              >
                Edit
              </button>
            )}

            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex h-full max-h-96 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Cover Image */}
            {(editData.coverImage || (isEditing && canEdit)) && (
              <div className="mb-6">
                {editData.coverImage && (
                  <div
                    className="h-32 rounded-lg bg-cover bg-center mb-2"
                    style={{ backgroundImage: `url(${editData.coverImage})` }}
                  />
                )}
                {isEditing && canEdit && (
                  <input
                    type="url"
                    value={editData.coverImage || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, coverImage: e.target.value || undefined }))}
                    placeholder="Cover image URL..."
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                )}
              </div>
            )}

            {/* Title */}
            <div className="mb-4">
              {isEditing && canEdit ? (
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-xl font-semibold p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {card.title}
                </h1>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
              {isEditing && canEdit ? (
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  {card.description || 'No description provided.'}
                </p>
              )}
            </div>

            {/* Card Color */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Card Color</h3>
              {isEditing && canEdit ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editData.color || '#ffffff'}
                    onChange={(e) => setEditData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
                    title="Choose card color"
                  />
                  <button
                    onClick={() => setEditData(prev => ({ ...prev, color: undefined }))}
                    className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Clear Color
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {editData.color || 'Default (white)'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: card.color || '#ffffff' }}
                    title="Current card color"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {card.color || 'Default (white)'}
                  </span>
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</h3>
              <div className="flex flex-wrap gap-1 mb-2">
                {editData.labels?.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                  >
                    {label}
                    {isEditing && canEdit && (
                      <button
                        onClick={() => removeLabel(label)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isEditing && canEdit && (
                <div className="flex flex-wrap gap-1">
                  {predefinedLabels.map((label) => (
                    <button
                      key={label}
                      onClick={() => addLabel(label)}
                      disabled={editData.labels?.includes(label)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        editData.labels?.includes(label)
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Activity & Comments ({comments.length})
              </h3>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
                  >
                    Comment
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium overflow-hidden relative">
                      {comment.userId.avatar ? (
                        <Image
                          src={comment.userId.avatar}
                          alt={`${comment.userId.firstName} ${comment.userId.lastName}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300">
                          {comment.userId.firstName.charAt(0)}{comment.userId.lastName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.userId.firstName} {comment.userId.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-64 p-4 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Actions</h3>

            <div className="space-y-2">
              {canEdit && (
                <>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Members
                  </button>

                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Set Due Date
                  </button>

                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Copy Card
                  </button>

                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    Archive Card
                  </button>
                </>
              )}

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Card
                </button>
              )}
            </div>

            {/* Card Info */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Card Info</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  Created {formatDate(card.createdAt)}
                </div>

                {card.dueDate && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    Due {formatDate(card.dueDate)}
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  {card.members.length} member{card.members.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Members */}
              {card.members.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Members</h4>
                  <div className="space-y-2">
                    {card.members.map((member) => (
                      <div key={member.userId._id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium overflow-hidden relative">
                          {member.userId.avatar ? (
                            <Image
                              src={member.userId.avatar}
                              alt={`${member.userId.firstName} ${member.userId.lastName}`}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 dark:text-gray-300">
                              {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {member.userId.firstName} {member.userId.lastName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCardModal;