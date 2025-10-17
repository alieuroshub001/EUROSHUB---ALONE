'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, AlertCircle, Save, Trash2, Plus } from 'lucide-react';
import Portal from '../../shared/Portal';
import { Task, Subtask, User } from '../../../types/project';
import toast from 'react-hot-toast';

interface TaskModalProps {
  task: Task | null;
  cardId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void | Promise<void>;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onAddSubtask?: (taskId: string, subtaskData: { title: string }) => Promise<void>;
  onUpdateSubtask?: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  onDeleteSubtask?: (taskId: string, subtaskId: string) => Promise<void>;
  projectMembers: Array<{
    userId: User;
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
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  projectMembers,
  canEdit
}) => {
  const [editData, setEditData] = useState<Partial<Task>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

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

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !onAddSubtask || !task || isAddingSubtask) return;

    setIsAddingSubtask(true);
    try {
      await onAddSubtask(task._id, { title: newSubtaskTitle.trim() });
      setNewSubtaskTitle('');
      toast.success('Subtask added successfully');
    } catch (error) {
      console.error('Error adding subtask:', error);
      toast.error('Failed to add subtask');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (!onUpdateSubtask || !task) return;

    try {
      await onUpdateSubtask(task._id, subtaskId, { completed });
      toast.success(completed ? 'Subtask completed' : 'Subtask marked incomplete');
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!onDeleteSubtask || !task) return;

    if (window.confirm('Are you sure you want to delete this subtask?')) {
      try {
        await onDeleteSubtask(task._id, subtaskId);
        toast.success('Subtask deleted successfully');
      } catch (error) {
        console.error('Error deleting subtask:', error);
        toast.error('Failed to delete subtask');
      }
    }
  };

  // Calculate task progress based on subtasks
  const getTaskProgress = () => {
    if (!task?.subtasks || task.subtasks.length === 0) return 0;
    const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedSubtasks / task.subtasks.length) * 100);
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
                            // Convert User to the simpler assignedTo format
                            const simplifiedUser = {
                              _id: member.userId._id,
                              firstName: member.userId.firstName || '',
                              lastName: member.userId.lastName || '',
                              avatar: member.userId.avatar
                            };
                            return {
                              ...prev,
                              assignedTo: [...currentAssigned, simplifiedUser]
                            };
                          } else {
                            return {
                              ...prev,
                              assignedTo: currentAssigned.filter(assigned =>
                                assigned._id !== member.userId._id
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
                dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined
              }))}
              disabled={!canEdit}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>

          {/* Task Status & Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
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
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getTaskProgress()}% ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks)
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getTaskProgress()}%` }}
                />
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subtasks ({task.subtasks?.length || 0})
              </label>
            </div>

            {/* Add New Subtask */}
            {canEdit && (
              <div className="mb-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAddingSubtask && handleAddSubtask()}
                    disabled={isAddingSubtask}
                    placeholder="Add a subtask..."
                    className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isAddingSubtask ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Adding...</span>
                      </>
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Subtasks List */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {task.subtasks.map((subtask, index) => (
                  <div
                    key={`${task._id}-${subtask._id}-${index}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      subtask.completed
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={(e) => canEdit && handleToggleSubtask(subtask._id, e.target.checked)}
                        disabled={!canEdit}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className={`text-sm ${
                        subtask.completed
                          ? 'line-through text-gray-500 dark:text-gray-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {subtask.title}
                      </span>
                    </div>

                    {subtask.completed && subtask.completedAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(subtask.completedAt).toLocaleDateString()}
                      </div>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => handleDeleteSubtask(subtask._id)}
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(!task.subtasks || task.subtasks.length === 0) && !canEdit && (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No subtasks yet
              </div>
            )}
          </div>

          {/* Task Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Info</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Created: {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'N/A'}</div>
              <div>Status: {task.completed ? 'Completed' : 'In Progress'}</div>
              {task.subtasks && task.subtasks.length > 0 && (
                <div>Progress: {getTaskProgress()}% complete</div>
              )}
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