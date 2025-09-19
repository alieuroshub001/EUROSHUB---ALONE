'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User, Tag, AlertCircle } from 'lucide-react';

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate?: string;
  tags: string[];
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

interface EditTaskModalProps {
  task: TaskData & { id: string };
  onClose: () => void;
  onSubmit: (taskId: string, taskData: TaskData) => void;
  teamMembers: TeamMember[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  onClose,
  onSubmit,
  teamMembers
}) => {
  const [formData, setFormData] = useState<TaskData>({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    assignees: task.assignees,
    dueDate: task.dueDate || '',
    tags: task.tags
  });
  const [newTag, setNewTag] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onSubmit(task.id, formData);
      onClose();
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleToggleAssignee = (memberName: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(memberName)
        ? prev.assignees.filter(name => name !== memberName)
        : [...prev.assignees, memberName]
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-200 text-red-700';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'low': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
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
          <h2 className="text-xl font-bold text-gray-900">Edit Task</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task description"
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignees
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
              >
                <span className="text-gray-700">
                  {formData.assignees.length > 0
                    ? `${formData.assignees.length} member(s) selected`
                    : 'Select team members'}
                </span>
                <User size={16} className="text-gray-400" />
              </button>

              {showAssigneeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAssigneeDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignees.includes(member.name)}
                          onChange={() => handleToggleAssignee(member.name)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              member.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.role}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Selected Assignees */}
            {formData.assignees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.assignees.map((assigneeName) => {
                  const member = teamMembers.find(m => m.name === assigneeName);
                  return (
                    <span
                      key={assigneeName}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      <span>{assigneeName}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAssignee(assigneeName)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Add
                </button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Priority Preview */}
          <div className="p-3 rounded-lg border-2 border-dashed">
            <p className="text-sm text-gray-600 mb-2">Task Preview:</p>
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getPriorityColor(formData.priority)}`}>
              <AlertCircle size={14} />
              <span>{formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)} Priority</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;