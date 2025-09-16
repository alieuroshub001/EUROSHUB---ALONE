'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  X,
  Calendar,
  Flag,
  User,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Tag,
  Archive,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { clsx } from 'clsx';

interface Card {
  _id: string;
  title: string;
  description?: string;
  position: number;
  list: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  isCompleted: boolean;
  assignedMembers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }>;
  labels: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  attachmentCount: number;
  commentCount: number;
  checklistProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

interface Label {
  _id: string;
  name: string;
  color: string;
}

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
  onUpdate: (card: Card) => void;
  boardLabels: Label[];
}

const priorityColors = {
  low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  urgent: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

export default function CardDetailModal({ card, onClose, onUpdate, boardLabels }: CardDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: card.title,
    description: card.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleSave = async () => {
    if (!editData.title.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/cards/${card._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: editData.title.trim(),
          description: editData.description.trim() || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.data.card);
        setIsEditing(false);
      } else {
        console.error('Failed to update card');
      }
    } catch (error) {
      console.error('Error updating card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/cards/${card._id}/toggle-complete`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.data.card);
      } else {
        console.error('Failed to toggle card completion');
      }
    } catch (error) {
      console.error('Error toggling card completion:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      // TODO: Implement comment creation API
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && !card.isCompleted;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none w-full"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditData({ title: card.title, description: card.description || '' });
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <h2
                    className={clsx(
                      'text-2xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded',
                      card.isCompleted && 'line-through opacity-60'
                    )}
                    onClick={() => setIsEditing(true)}
                  >
                    {card.title}
                  </h2>
                )}

                {/* Status indicators */}
                <div className="flex items-center space-x-3 mt-2">
                  <span className={clsx(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    priorityColors[card.priority].bg,
                    priorityColors[card.priority].text
                  )}>
                    {card.priority} priority
                  </span>

                  {card.isCompleted && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  )}

                  {isOverdue && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Labels */}
              {card.labels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Labels</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.labels.map((label) => (
                      <span
                        key={label._id}
                        className="px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a more detailed description..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                ) : (
                  <div
                    onClick={() => setIsEditing(true)}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors min-h-[80px]"
                  >
                    {card.description ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{card.description}</p>
                    ) : (
                      <p className="text-gray-500 italic">Add a more detailed description...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Checklist Progress */}
              {card.checklistProgress && card.checklistProgress.total > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Checklist</h3>
                    <span className="text-sm text-gray-500">
                      {card.checklistProgress.completed}/{card.checklistProgress.total} completed
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all',
                        card.checklistProgress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${card.checklistProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Assigned Members */}
              {card.assignedMembers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Assigned Members</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.assignedMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-600 font-medium">
                              {member.firstName[0]}{member.lastName[0]}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-700">
                          {member.firstName} {member.lastName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity/Comments Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Activity</h3>

                {/* Add Comment */}
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  {newComment.trim() && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleAddComment}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Comment
                      </button>
                    </div>
                  )}
                </div>

                {/* Comments placeholder */}
                <div className="text-gray-500 text-sm italic">
                  No comments yet. Be the first to comment!
                </div>
              </div>
            </div>

            {/* Save/Cancel buttons when editing */}
            {isEditing && (
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({ title: card.title, description: card.description || '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !editData.title.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-l border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>

            {/* Complete/Reopen */}
            <button
              onClick={handleToggleComplete}
              className={clsx(
                'w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                card.isCompleted
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              )}
            >
              <CheckSquare className="w-4 h-4" />
              <span>{card.isCompleted ? 'Reopen Card' : 'Mark Complete'}</span>
            </button>

            {/* Edit Labels */}
            <button className="w-full flex items-center space-x-2 px-3 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
              <Tag className="w-4 h-4" />
              <span>Labels</span>
            </button>

            {/* Add Members */}
            <button className="w-full flex items-center space-x-2 px-3 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
              <User className="w-4 h-4" />
              <span>Members</span>
            </button>

            {/* Due Date */}
            <button className="w-full flex items-center space-x-2 px-3 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
              <Calendar className="w-4 h-4" />
              <span>Due Date</span>
            </button>

            {/* Attachments */}
            <button className="w-full flex items-center space-x-2 px-3 py-2 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
              <Paperclip className="w-4 h-4" />
              <span>Attachment</span>
            </button>

            {/* Current due date */}
            {card.dueDate && (
              <div className="pt-3 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 mb-2">DUE DATE</h4>
                <div className={clsx(
                  'px-3 py-2 rounded-lg text-sm',
                  isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                )}>
                  {format(new Date(card.dueDate), 'MMM d, yyyy')}
                  {isOverdue && ' (overdue)'}
                </div>
              </div>
            )}

            {/* Card Info */}
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 mb-2">CREATED</h4>
              <p className="text-sm text-gray-600">
                {format(new Date(card.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                by {card.createdBy.firstName} {card.createdBy.lastName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}