'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, AlertCircle, Save, Trash2 } from 'lucide-react';
import Portal from '../../shared/Portal';

interface Task {
  _id: string;
  title: string;
  completed: boolean;
  assignedTo?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }> | {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  description?: string;
  createdAt: Date;
}

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void | Promise<void>;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  projectMembers: Array<{
    userId: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: string;
  }>;
  canEdit: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  projectMembers,
  canEdit
}) => {
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedTo: task.assignedTo
      });
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    if (!editData.title?.trim()) return;

    setIsLoading(true);
    try {
      // Keep assignedTo as the Task type expects (array of user objects)
      onUpdateTask(task._id, editData);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(task._id);
      onClose();
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-600 border-green-200',
    medium: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    high: 'bg-red-100 text-red-600 border-red-200'
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] overflow-hidden flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Task
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Task Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Title
            </label>
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
              disabled={!canEdit}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
              placeholder="Enter task title..."
            />
          </div>

          {/* Task Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
              rows={4}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 resize-none"
              placeholder="Add task description..."
            />
          </div>

          {/* Priority */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((priority) => (
                <button
                  key={priority}
                  onClick={() => canEdit && setEditData(prev => ({ ...prev, priority }))}
                  disabled={!canEdit}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    editData.priority === priority
                      ? priorityColors[priority]
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned To
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 max-h-48 overflow-y-auto">
              {projectMembers.map((member) => {
                const assignedToArray = Array.isArray(editData.assignedTo)
                  ? editData.assignedTo
                  : (editData.assignedTo ? [editData.assignedTo] : []);
                const isSelected = assignedToArray.some(assigned =>
                  (typeof assigned === 'string' ? assigned : assigned._id) === member.userId._id
                );

                return (
                  <label
                    key={member.userId._id}
                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                      !canEdit ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (!canEdit) return;

                        setEditData(prev => {
                          const currentAssigned = Array.isArray(prev.assignedTo)
                            ? prev.assignedTo
                            : (prev.assignedTo ? [prev.assignedTo] : []);

                          if (e.target.checked) {
                            return {
                              ...prev,
                              assignedTo: [...currentAssigned, member.userId]
                            };
                          } else {
                            return {
                              ...prev,
                              assignedTo: currentAssigned.filter(assigned =>
                                (typeof assigned === 'string' ? assigned : assigned._id) !== member.userId._id
                              )
                            };
                          }
                        });
                      }}
                      disabled={!canEdit}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {member.userId.avatar ? (
                        <Image
                          src={member.userId.avatar}
                          alt={`${member.userId.firstName} ${member.userId.lastName}`}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                          {member.userId.firstName?.charAt(0)}{member.userId.lastName?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.userId.firstName} {member.userId.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {member.role}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Display selected members */}
            {Array.isArray(editData.assignedTo) && editData.assignedTo.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {editData.assignedTo.map((assigned) => {
                  if (typeof assigned === 'string') return null;
                  return (
                    <div key={assigned._id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                        {assigned.avatar ? (
                          <Image
                            src={assigned.avatar}
                            alt={`${assigned.firstName} ${assigned.lastName}`}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                            {assigned.firstName?.charAt(0)}{assigned.lastName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-700 dark:text-gray-300">
                        {assigned.firstName} {assigned.lastName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={editData.dueDate ? new Date(editData.dueDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEditData(prev => ({
                ...prev,
                dueDate: e.target.value ? new Date(e.target.value) : undefined
              }))}
              disabled={!canEdit}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>

          {/* Task Status */}
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => canEdit && onUpdateTask(task._id, { completed: e.target.checked })}
                disabled={!canEdit}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mark as completed
              </span>
            </label>
          </div>

          {/* Task Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Info</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
              <div>Status: {task.completed ? 'Completed' : 'In Progress'}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex justify-between">
            {canEdit && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            )}

            <div className="flex gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {canEdit && (
                <button
                  onClick={handleSave}
                  disabled={isLoading || !editData.title?.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </Portal>
  );
};

export default TaskModal;