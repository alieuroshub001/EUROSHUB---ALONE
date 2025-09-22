'use client';

import { useState, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { X, Calendar, User, Tag, AlertCircle, Plus, Check, Trash2, CheckSquare } from 'lucide-react';

interface Member {
  id?: string;
  _id?: string;
  name: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignees: string[];
  dueDate?: string;
  tags: string[];
  subtasks?: Subtask[];
}

interface CreateTaskModalProps {
  onClose: () => void;
  onSubmit: (taskData: TaskData) => void;
  columnTitle?: string;
  teamMembers?: Member[];
  project?: {
    startDate?: string;
    endDate?: string;
    title?: string;
  };
}

interface Priority {
  value: 'low' | 'medium' | 'high';
  label: string;
  color: string;
}

const priorities: Priority[] = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' }
];

const predefinedTags: string[] = [
  'design', 'development', 'research', 'testing', 'documentation',
  'meeting', 'review', 'bug', 'feature', 'urgent'
];

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  onClose,
  onSubmit,
  columnTitle,
  teamMembers = [],
  project
}) => {
  const [formData, setFormData] = useState<TaskData>({
    title: '',
    description: '',
    priority: 'medium',
    assignees: [],
    dueDate: '',
    tags: [],
    subtasks: []
  });

  const [tagInput, setTagInput] = useState<string>('');
  const [newSubtask, setNewSubtask] = useState<string>('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.title.trim()) {
      console.log('=== CREATE TASK MODAL DEBUG ===');
      console.log('Form data being submitted:', JSON.stringify(formData, null, 2));
      console.log('Subtasks in form data:', formData.subtasks);
      console.log('Number of subtasks:', formData.subtasks?.length || 0);
      formData.subtasks?.forEach((subtask, index) => {
        console.log(`Subtask ${index + 1}:`, subtask);
      });
      console.log('=== END CREATE TASK MODAL DEBUG ===');
      onSubmit(formData);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleAssignee = (memberName: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(memberName)
        ? prev.assignees.filter(a => a !== memberName)
        : [...prev.assignees, memberName]
    }));
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput.trim().toLowerCase());
    }
  };

  // Subtask management functions
  const addSubtask = () => {
    if (newSubtask.trim()) {
      const subtask: Subtask = {
        id: Date.now().toString(),
        title: newSubtask.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };

      console.log('=== ADD SUBTASK DEBUG ===');
      console.log('Adding new subtask:', subtask);
      console.log('Current subtasks before adding:', formData.subtasks);

      setFormData(prev => {
        const newFormData = {
          ...prev,
          subtasks: [...(prev.subtasks || []), subtask]
        };
        console.log('New form data after adding subtask:', newFormData.subtasks);
        console.log('=== END ADD SUBTASK DEBUG ===');
        return newFormData;
      });
      setNewSubtask('');
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map(subtask =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              completed: !subtask.completed,
              completedAt: !subtask.completed ? new Date().toISOString() : undefined
            }
          : subtask
      ) || []
    }));
  };

  const removeSubtask = (subtaskId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(subtask => subtask.id !== subtaskId) || []
    }));
  };

  const calculateCompletionRate = (): number => {
    const subtasks = formData.subtasks || [];
    if (subtasks.length === 0) return 0;
    const completedCount = subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  const handleSubtaskInputKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtask.trim()) {
      e.preventDefault();
      addSubtask();
    }
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
              <p className="text-sm text-gray-500">Adding to: {columnTitle}</p>
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
          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Design homepage mockup"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Task Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the task..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Due Date
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                min={project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : undefined}
                max={project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : undefined}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              {project && (project.startDate || project.endDate) && (
                <p className="mt-1 text-xs text-gray-500">
                  {project.startDate && project.endDate && (
                    <>Must be between {new Date(project.startDate).toLocaleDateString()} and {new Date(project.endDate).toLocaleDateString()}</>
                  )}
                  {project.startDate && !project.endDate && (
                    <>Must be after {new Date(project.startDate).toLocaleDateString()}</>
                  )}
                  {!project.startDate && project.endDate && (
                    <>Must be before {new Date(project.endDate).toLocaleDateString()}</>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <User size={16} className="inline mr-1" />
              Assign to Team Members
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {teamMembers.map((member) => (
                <label key={member._id || member.id || member.name} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.assignees.includes(member.name)}
                    onChange={() => toggleAssignee(member.name)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 truncate">{member.name}</span>
                </label>
              ))}
            </div>
            {formData.assignees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {formData.assignees.map((assignee) => (
                  <span
                    key={assignee}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {assignee}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag size={16} className="inline mr-1" />
              Tags
            </label>
            <div className="space-y-3">
              {/* Tag Input */}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                placeholder="Type and press Enter to add custom tag"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />

              {/* Predefined Tags */}
              <div className="flex flex-wrap gap-2">
                {predefinedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    disabled={formData.tags.includes(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${formData.tags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 border-blue-200 cursor-not-allowed'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Selected Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <CheckSquare size={16} className="inline mr-1" />
              Subtasks
              {formData.subtasks && formData.subtasks.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({calculateCompletionRate()}% complete)
                </span>
              )}
            </label>

            <div className="space-y-3">
              {/* Add New Subtask */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={handleSubtaskInputKeyPress}
                  placeholder="Add a subtask..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Subtasks List */}
              <div className="space-y-2">
                {formData.subtasks && formData.subtasks.length > 0 ? (
                  formData.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        subtask.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSubtask(subtask.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          subtask.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {subtask.completed && <Check size={14} />}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          subtask.completed
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {subtask.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(subtask.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete subtask"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No subtasks added. Break down your task into smaller steps!
                  </div>
                )}
              </div>

              {/* Completion Progress */}
              {formData.subtasks && formData.subtasks.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm text-gray-600">{calculateCompletionRate()}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateCompletionRate()}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.subtasks.filter(s => s.completed).length} of {formData.subtasks.length} completed
                  </div>
                </div>
              )}
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
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;