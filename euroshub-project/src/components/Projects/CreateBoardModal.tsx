'use client';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { X, Palette, Briefcase, Users, UserCheck } from 'lucide-react';

interface Member {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email: string;
  } | null;
  role: string;
}

interface BoardData {
  name: string;
  description?: string;
  color: string;
  selectedMembers?: string[];
}

interface CreateBoardModalProps {
  onClose: () => void;
  onSubmit: (boardData: BoardData) => void;
  projectMembers?: Member[];
}

const boardColors: string[] = [
  '#0fb8af', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6B7280', '#14B8A6', '#F97316'
];

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onClose, onSubmit, projectMembers = [] }) => {
  const [formData, setFormData] = useState<BoardData>({
    name: '',
    description: '',
    color: '#0fb8af',
    selectedMembers: []
  });
  const [showMemberSelection, setShowMemberSelection] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const toggleMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers?.includes(memberId)
        ? prev.selectedMembers.filter(id => id !== memberId)
        : [...(prev.selectedMembers || []), memberId]
    }));
  };

  const selectAllMembers = () => {
    const allMemberIds = projectMembers.filter(m => m.user).map(m => m.user!._id);
    setFormData(prev => ({ ...prev, selectedMembers: allMemberIds }));
  };

  const clearAllMembers = () => {
    setFormData(prev => ({ ...prev, selectedMembers: [] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Board</h2>
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
          {/* Board Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Board Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Website Redesign Project"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* Board Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of what this board is for..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Palette size={16} className="inline mr-2" />
              Board Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {boardColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all duration-200 ${formData.color === color
                    ? 'border-gray-800 scale-110 shadow-lg'
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                    }`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                >
                  {formData.color === color && (
                    <div className="w-full h-full rounded-md bg-white/20 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection */}
          {projectMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Users size={16} className="inline mr-2" />
                  Board Members
                </label>
                <button
                  type="button"
                  onClick={() => setShowMemberSelection(!showMemberSelection)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showMemberSelection ? 'Hide' : 'Show'} ({formData.selectedMembers?.length || 0} selected)
                </button>
              </div>

              {showMemberSelection && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Select members to add to this board</p>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={selectAllMembers}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllMembers}
                        className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {projectMembers.filter(member => member.user).map((member) => {
                      const isSelected = formData.selectedMembers?.includes(member.user!._id) || false;
                      return (
                        <label
                          key={member._id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleMember(member.user!._id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                              {member.user?.avatar ? (
                                <img
                                  src={member.user.avatar}
                                  alt={`${member.user.firstName} ${member.user.lastName}`}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                `${member.user!.firstName[0]}${member.user!.lastName[0]}`
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {member.user!.firstName} {member.user!.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{member.role}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <UserCheck size={16} className="text-green-600" />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {formData.selectedMembers?.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No members selected. Board will be created without members.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
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
              disabled={!formData.name.trim()}
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;