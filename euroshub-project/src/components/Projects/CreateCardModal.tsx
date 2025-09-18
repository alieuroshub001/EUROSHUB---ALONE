'use client';

import { useState } from 'react';
import { X, Calendar, User, Tag, AlertCircle, Plus, Clock, Flag } from 'lucide-react';
import { CreateCardData, ProjectMember } from '@/types/project';

interface CreateCardModalProps {
  onClose: () => void;
  onSubmit: (cardData: CreateCardData) => void;
  listTitle: string;
  projectMembers: ProjectMember[];
}

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800', icon: Clock },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800', icon: Flag },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-200 text-red-900', icon: AlertCircle }
];

const predefinedLabels = [
  { name: 'Bug', color: '#EF4444' },
  { name: 'Feature', color: '#3B82F6' },
  { name: 'Enhancement', color: '#10B981' },
  { name: 'Documentation', color: '#8B5CF6' },
  { name: 'Testing', color: '#F59E0B' },
  { name: 'Design', color: '#EC4899' },
  { name: 'Backend', color: '#6B7280' },
  { name: 'Frontend', color: '#06B6D4' },
  { name: 'Research', color: '#84CC16' },
  { name: 'Urgent', color: '#DC2626' }
];

const CreateCardModal = ({ onClose, onSubmit, listTitle, projectMembers }: CreateCardModalProps) => {
  const [formData, setFormData] = useState<CreateCardData>({
    title: '',
    description: '',
    assignedTo: [],
    priority: 'medium',
    dueDate: '',
    labels: []
  });

  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [customLabel, setCustomLabel] = useState({ name: '', color: '#3B82F6' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Card title is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const submitData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        dueDate: formData.dueDate || undefined,
        checklist: checklistItems.map(text => ({
          text,
          completed: false
        }))
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

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo?.includes(userId)
        ? prev.assignedTo.filter(id => id !== userId)
        : [...(prev.assignedTo || []), userId]
    }));
  };

  const addLabel = (label: { name: string; color: string }) => {
    if (!formData.labels?.some(l => l.name === label.name)) {
      setFormData(prev => ({
        ...prev,
        labels: [...(prev.labels || []), label]
      }));
    }
  };

  const removeLabel = (labelName: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels?.filter(l => l.name !== labelName) || []
    }));
  };

  const addCustomLabel = () => {
    if (customLabel.name.trim()) {
      addLabel(customLabel);
      setCustomLabel({ name: '', color: '#3B82F6' });
    }
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklistItems([...checklistItems, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
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
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Card</h2>
              <p className="text-sm text-gray-500">Adding to list: {listTitle}</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Card Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Card Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Implement user authentication"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Card Description */}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="space-y-2">
                  {priorities.map((priority) => {
                    const Icon = priority.icon;
                    return (
                      <label key={priority.value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value={priority.value}
                          checked={formData.priority === priority.value}
                          onChange={handleChange}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Icon size={16} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {projectMembers.map((member) => (
                  <label key={member._id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.assignedTo?.includes(member.user._id) || false}
                      onChange={() => toggleAssignee(member.user._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                        {member.user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{member.user.name}</span>
                    </div>
                  </label>
                ))}
              </div>
              {(formData.assignedTo?.length || 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.assignedTo?.map((userId) => {
                    const member = projectMembers.find(m => m.user._id === userId);
                    return member ? (
                      <span
                        key={userId}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {member.user.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag size={16} className="inline mr-1" />
                Labels
              </label>
              <div className="space-y-4">
                {/* Predefined Labels */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Quick Labels</h4>
                  <div className="flex flex-wrap gap-2">
                    {predefinedLabels.map((label) => (
                      <button
                        key={label.name}
                        type="button"
                        onClick={() => addLabel(label)}
                        disabled={formData.labels?.some(l => l.name === label.name) || false}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          formData.labels?.some(l => l.name === label.name)
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:opacity-80 cursor-pointer'
                        }`}
                        style={{
                          backgroundColor: label.color + '20',
                          color: label.color,
                          borderColor: label.color + '40'
                        }}
                      >
                        {label.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Label */}
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Custom Label</h4>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={customLabel.name}
                      onChange={(e) => setCustomLabel({ ...customLabel, name: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, addCustomLabel)}
                      placeholder="Label name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="color"
                      value={customLabel.color}
                      onChange={(e) => setCustomLabel({ ...customLabel, color: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={addCustomLabel}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Selected Labels */}
                {(formData.labels?.length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Selected Labels</h4>
                    <div className="flex flex-wrap gap-1">
                      {formData.labels?.map((label) => (
                        <span
                          key={label.name}
                          className="inline-flex items-center px-2 py-1 text-xs rounded-full"
                          style={{
                            backgroundColor: label.color + '20',
                            color: label.color,
                            border: `1px solid ${label.color}40`
                          }}
                        >
                          {label.name}
                          <button
                            type="button"
                            onClick={() => removeLabel(label.name)}
                            className="ml-1 hover:bg-black/10 rounded"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Checklist
              </label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, addChecklistItem)}
                    placeholder="Add checklist item"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {checklistItems.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {checklistItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{item}</span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-end space-x-3">
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
                Create Card
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCardModal;