'use client';

import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Crown, Shield, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import Portal from '../../shared/Portal';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
}

interface ProjectMember {
  userId: User;
  role: string;
  assignedAt: Date;
}

interface MemberAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMembers: ProjectMember[];
  onAddMember: (userId: string, role: string) => void;
  onRemoveMember: (userId: string) => void;
  onUpdateMemberRole: (userId: string, newRole: string) => void;
  boardMembers: User[]; // All board members that can be assigned
  currentUserId?: string; // Current user ID to exclude from available users
}

const MemberAssignmentModal: React.FC<MemberAssignmentModalProps> = ({
  isOpen,
  onClose,
  currentMembers,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  boardMembers,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Project roles with detailed permissions
  const projectRoles = [
    {
      value: 'project-manager',
      label: 'Project Manager',
      icon: Crown,
      color: 'text-purple-600 bg-purple-100',
      description: 'Full access to project management, can manage all aspects',
      permissions: ['read', 'write', 'delete', 'manage_members', 'upload_files', 'comment', 'assign_tasks']
    },
    {
      value: 'lead',
      label: 'Team Lead',
      icon: Shield,
      color: 'text-blue-600 bg-blue-100',
      description: 'Can manage tasks, assign work, and upload files',
      permissions: ['read', 'write', 'upload_files', 'comment', 'assign_tasks']
    },
    {
      value: 'contributor',
      label: 'Contributor',
      icon: UserIcon,
      color: 'text-green-600 bg-green-100',
      description: 'Can edit content, upload files, and comment',
      permissions: ['read', 'write', 'upload_files', 'comment']
    },
    {
      value: 'commenter',
      label: 'Commenter',
      icon: UserIcon,
      color: 'text-yellow-600 bg-yellow-100',
      description: 'Can view content and add comments only',
      permissions: ['read', 'comment']
    },
    {
      value: 'viewer',
      label: 'View Only',
      icon: UserIcon,
      color: 'text-gray-600 bg-gray-100',
      description: 'Can only view project content, no editing',
      permissions: ['read']
    }
  ];

  useEffect(() => {
    if (isOpen) {
      // Filter out users who are already members of the project and the current user
      const currentMemberIds = currentMembers.map(member => member.userId._id);
      const available = boardMembers.filter(user =>
        !currentMemberIds.includes(user._id) &&
        user._id !== currentUserId // Exclude current user from being added
      );
      setAvailableUsers(available);
    }
  }, [isOpen, currentMembers, boardMembers, currentUserId]);

  if (!isOpen) return null;

  const filteredUsers = availableUsers.filter(user =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMember = (userId: string) => {
    onAddMember(userId, selectedRole);
    setSearchTerm('');

    // Remove the user from available users
    setAvailableUsers(prev => prev.filter(user => user._id !== userId));
  };

  const handleRemoveMember = (userId: string) => {
    onRemoveMember(userId);

    // Add the user back to available users
    const removedUser = boardMembers.find(user => user._id === userId);
    if (removedUser) {
      setAvailableUsers(prev => [...prev, removedUser]);
    }
  };

  const getRoleInfo = (roleValue: string) => {
    return projectRoles.find(role => role.value === roleValue) || projectRoles[2]; // Default to member
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
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Project Members
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add or remove team members and assign roles
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Current Members */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Current Members ({currentMembers.length})
            </h3>

            {currentMembers.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMembers
                  .filter((member, index, array) =>
                    array.findIndex(m => m.userId._id === member.userId._id) === index
                  )
                  .map((member, index) => {
                  // const roleInfo = getRoleInfo(member.role);

                  return (
                    <div
                      key={`${member.userId._id}-${index}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      {member.userId.avatar ? (
                        // User has avatar - display image only without background
                        <div className="w-10 h-10 rounded-full overflow-hidden relative">
                          <Image
                            src={member.userId.avatar}
                            alt={`${member.userId.firstName} ${member.userId.lastName}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        // User has no avatar - display initials with background color
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                          </span>
                        </div>
                      )}

                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {member.userId.firstName} {member.userId.lastName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {member.userId.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <select
                            value={member.role}
                            onChange={(e) => onUpdateMemberRole(member.userId._id, e.target.value)}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {projectRoles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getRoleInfo(member.role).description}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveMember(member.userId._id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Remove member"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Members */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add New Members
            </h3>

            {/* Role Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Role for New Members
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectRoles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`flex flex-col items-start gap-2 p-3 rounded-lg border text-sm transition-colors ${
                        selectedRole === role.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{role.label}</span>
                      </div>
                      <p className="text-xs text-left opacity-75">
                        {role.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.permissions.map((permission, index) => (
                          <span
                            key={`${role.value}-${permission}-${index}`}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded"
                          >
                            {permission.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search board members..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Available Users */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  {availableUsers.length === 0 ? (
                    <p>All board members are already assigned to this project</p>
                  ) : (
                    <p>No members found matching &quot;{searchTerm}&quot;</p>
                  )}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {user.avatar ? (
                      // User has avatar - display image only without background
                      <div className="w-8 h-8 rounded-full overflow-hidden relative">
                        <Image
                          src={user.avatar}
                          alt={`${user.firstName} ${user.lastName}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      // User has no avatar - display initials with background color
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email} • {user.role}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddMember(user._id)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
      </div>
    </Portal>
  );
};

export default MemberAssignmentModal;