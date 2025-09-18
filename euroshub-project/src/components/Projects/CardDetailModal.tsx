'use client';

import { useState } from 'react';
import { X, Calendar, User, Tag, MessageCircle, Clock, Paperclip, Plus, Edit3, Trash2 } from 'lucide-react';
import { Card, ProjectMember, Comment, ChecklistItem } from '@/types/project';
import { format } from 'date-fns';

interface CardDetailModalProps {
  card: Card;
  onClose: () => void;
  onUpdate: (updatedCard: Card) => void;
  projectMembers: ProjectMember[];
}

const CardDetailModal = ({ card, onClose, onUpdate, projectMembers }: CardDetailModalProps) => {
  const [editMode, setEditMode] = useState(false);
  const [editedCard, setEditedCard] = useState(card);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const handleSave = () => {
    onUpdate(editedCard);
    setEditMode(false);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        _id: Date.now().toString(),
        text: newComment.trim(),
        author: projectMembers[0].user, // Mock current user
        mentions: [],
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEditedCard(prev => ({
        ...prev,
        comments: [...prev.comments, comment]
      }));
      setNewComment('');
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setEditedCard(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item._id === itemId
          ? {
              ...item,
              completed: !item.completed,
              completedAt: !item.completed ? new Date().toISOString() : undefined,
              completedBy: !item.completed ? projectMembers[0].user : undefined
            }
          : item
      )
    }));
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const item: ChecklistItem = {
        _id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEditedCard(prev => ({
        ...prev,
        checklist: [...prev.checklist, item]
      }));
      setNewChecklistItem('');
    }
  };

  const completedChecklist = editedCard.checklist.filter(item => item.completed).length;
  const totalChecklist = editedCard.checklist.length;
  const checklistProgress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1">
            {editMode ? (
              <input
                type="text"
                value={editedCard.title}
                onChange={(e) => setEditedCard(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1"
              />
            ) : (
              <h2 className="text-xl font-semibold text-gray-900">{card.title}</h2>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditedCard(card);
                    setEditMode(false);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit3 size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                {editMode ? (
                  <textarea
                    value={editedCard.description || ''}
                    onChange={(e) => setEditedCard(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a description..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                ) : (
                  <div className="text-gray-600">
                    {card.description || (
                      <span className="italic text-gray-400">No description provided</span>
                    )}
                  </div>
                )}
              </div>

              {/* Checklist */}
              {(editedCard.checklist.length > 0 || editMode) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Checklist ({completedChecklist}/{totalChecklist})
                    </h3>
                    {totalChecklist > 0 && (
                      <span className="text-sm text-gray-600">{Math.round(checklistProgress)}% complete</span>
                    )}
                  </div>

                  {totalChecklist > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${checklistProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    {editedCard.checklist.map((item) => (
                      <div key={item._id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklistItem(item._id)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.text}
                        </span>
                        {item.completed && item.completedAt && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(item.completedAt), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    ))}

                    {editMode && (
                      <div className="flex space-x-2 mt-3">
                        <input
                          type="text"
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                          placeholder="Add checklist item"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleAddChecklistItem}
                          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Comments ({editedCard.comments.length})
                </h3>

                {/* Add Comment */}
                <div className="mb-4">
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                      {projectMembers[0]?.user.name.split(' ').map(n => n[0]).join('') || 'U'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {editedCard.comments.map((comment) => (
                    <div key={comment._id} className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                        {comment.author.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{comment.author.name}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(comment.createdAt), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p className="text-gray-700">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {editedCard.comments.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No comments yet. Be the first to comment!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status & Priority */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  {editMode ? (
                    <select
                      value={editedCard.status}
                      onChange={(e) => setEditedCard(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">
                      {card.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  {editMode ? (
                    <select
                      value={editedCard.priority}
                      onChange={(e) => setEditedCard(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      card.priority === 'urgent' ? 'bg-red-200 text-red-900' :
                      card.priority === 'high' ? 'bg-red-100 text-red-800' :
                      card.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {card.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Due Date</span>
                </div>
                {editMode ? (
                  <input
                    type="date"
                    value={editedCard.dueDate || ''}
                    onChange={(e) => setEditedCard(prev => ({ ...prev, dueDate: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : card.dueDate ? (
                  <div className="text-gray-900">
                    {format(new Date(card.dueDate), 'MMM dd, yyyy')}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No due date set</div>
                )}
              </div>

              {/* Assignees */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Assignees</span>
                </div>
                <div className="space-y-2">
                  {card.assignedTo.map((assignee) => (
                    <div key={assignee._id} className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                        {assignee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-gray-700">{assignee.name}</span>
                    </div>
                  ))}
                  {card.assignedTo.length === 0 && (
                    <div className="text-gray-500 italic">No assignees</div>
                  )}
                </div>
              </div>

              {/* Labels */}
              {card.labels.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Tag size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Labels</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {card.labels.map((label) => (
                      <span
                        key={label.name}
                        className="px-2 py-1 text-xs rounded-full"
                        style={{
                          backgroundColor: label.color + '20',
                          color: label.color,
                          border: `1px solid ${label.color}40`
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Activity</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <MessageCircle size={14} />
                    <span>{card.comments.length} comments</span>
                  </div>
                  {card.attachments.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Paperclip size={14} />
                      <span>{card.attachments.length} attachments</span>
                    </div>
                  )}
                  {card.timeTracking && card.timeTracking.spent > 0 && (
                    <div className="flex items-center space-x-2">
                      <Clock size={14} />
                      <span>{card.timeTracking.spent}h tracked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;