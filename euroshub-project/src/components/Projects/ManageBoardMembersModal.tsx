'use client';

import { useState, useEffect } from 'react';
import { X, Users, UserPlus, UserMinus, UserCheck } from 'lucide-react';

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

interface BoardMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

interface ManageBoardMembersModalProps {
  onClose: () => void;
  onUpdateMembers: (memberIds: string[]) => void;
  boardName: string;
  currentBoardMembers: BoardMember[];
  availableMembers: Member[];
}

const ManageBoardMembersModal: React.FC<ManageBoardMembersModalProps> = ({
  onClose,
  onUpdateMembers,
  boardName,
  currentBoardMembers,
  availableMembers
}) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize with current board members
    setSelectedMemberIds(currentBoardMembers.map(member => member.id));
  }, [currentBoardMembers]);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onUpdateMembers(selectedMemberIds);
      onClose();
    } catch (error) {
      console.error('Failed to update board members:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectAll = () => {
    const allMemberIds = availableMembers
      .filter(member => member.user)
      .map(member => member.user!._id);
    setSelectedMemberIds(allMemberIds);
  };

  const clearAll = () => {
    setSelectedMemberIds([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="text-blue-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Manage Board Members</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{boardName}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select project members to add to this board. Selected members will have access to view and work with tasks on this board.
            </p>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedMemberIds.length} of {availableMembers.filter(m => m.user).length} members selected
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {availableMembers
              .filter(member => member.user)
              .map((member) => {
                const isSelected = selectedMemberIds.includes(member.user!._id);
                return (
                  <label
                    key={member._id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMember(member.user!._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
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
                        <p className="text-xs text-gray-500">{member.user!.email}</p>
                        <p className="text-xs text-gray-400">{member.role}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <UserCheck size={16} className="text-green-600" />
                    )}
                  </label>
                );
              })}
          </div>

          {availableMembers.filter(m => m.user).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>No project members available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Members'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageBoardMembersModal;