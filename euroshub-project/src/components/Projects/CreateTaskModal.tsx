'use client';

import { useState, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { X, Calendar, User, Tag, AlertCircle } from 'lucide-react';

interface Member {
  id?: string;
  _id?: string;
  name: string;
}

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignees: string[];
  dueDate?: string;
  tags: string[];
}

interface CreateTaskModalProps {
  onClose: () => void;
  onSubmit: (taskData: TaskData) => void;
  columnTitle?: string;
  teamMembers?: Member[];
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
  teamMembers = []
}) => {
  const [formData, setFormData] = useState<TaskData>({
    title: '',
    description: '',
    priority: 'medium',
    assignees: [],
    dueDate: '',
    tags: []
  });

  const [tagInput, setTagInput] = useState<string>('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.title.trim()) {
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
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