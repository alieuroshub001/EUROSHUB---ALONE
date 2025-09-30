'use client';

import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Users, Shield, Eye, Edit, Crown } from 'lucide-react';
import Portal from '../shared/Portal';
import { usersApi, User as FullUser } from '@/services/trelloBoardsApi';

// Board member user info (limited fields from backend)
interface BoardMemberUser {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface BoardMember {
  userId: BoardMemberUser;
  role: string;
  joinedAt: Date;
}

interface BoardMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
  currentMembers: BoardMember[];
  onAddMember: (userId: string, role: string) => void;
  onRemoveMember: (userId: string) => void;
  onUpdateMemberRole: (userId: string, newRole: string) => void;
  currentUserId?: string;
}

const BoardMembersModal: React.FC<BoardMembersModalProps> = ({
  isOpen,
  onClose,
  boardTitle,
  currentMembers,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [allUsers, setAllUsers] = useState<FullUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Board-level roles with detailed permissions
  const boardRoles = [
    {
      value: 'owner',
      label: 'Owner',
      icon: Crown,
      color: 'text-purple-600 bg-purple-100 border-purple-200',
      description: 'Full control over the board and all its content',
      permissions: ['Full board access', 'Manage members', 'Delete board', 'All operations']
    },
    {
      value: 'admin',
      label: 'Admin',
      icon: Shield,
      color: 'text-red-600 bg-red-100 border-red-200',
      description: 'Can manage board settings and members',
      permissions: ['Edit board', 'Manage members', 'Create/delete lists', 'Manage cards']
    },
    {
      value: 'editor',
      label: 'Editor',
      icon: Edit,
      color: 'text-blue-600 bg-blue-100 border-blue-200',
      description: 'Can edit board content and manage cards',
      permissions: ['Edit cards', 'Create lists', 'Move cards', 'Add comments']
    },
    {
      value: 'viewer',
      label: 'Viewer',
      icon: Eye,
      color: 'text-gray-600 bg-gray-100 border-gray-200',
      description: 'Can only view board content',
      permissions: ['View board', 'View cards', 'Read comments']
    }
  ];

  // Fetch all registered users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
    }
  }, [isOpen]);

  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      const users = await usersApi.getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to empty array if API fails
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter out users who are already members and the current user
  const currentMemberIds = currentMembers.map(member => member.userId._id);
  const availableUsers = allUsers.filter(user =>
    !currentMemberIds.includes(user._id) &&
    user._id !== currentUserId
  );

  const filteredUsers = availableUsers.filter(user =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleInfo = (roleValue: string) => {
    return boardRoles.find(role => role.value === roleValue) || boardRoles[3]; // Default to viewer
  };

  const handleAddMember = (userId: string) => {
    onAddMember(userId, selectedRole);
    setSearchTerm('');
  };

  const isCreator = (member: BoardMember) => {
    // Board creator would typically have owner role
    return member.role === 'owner';
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Board Members
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage access and permissions for &quot;{boardTitle}&quot;
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Current Members Panel */}
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Current Members ({currentMembers.length})
              </h3>

              {currentMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No members added yet</p>
                  <p className="text-sm mt-1">Add members to start collaborating</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentMembers
                    .filter((member, index, array) =>
                      array.findIndex(m => m.userId._id === member.userId._id) === index
                    )
                    .map((member, index) => {
                    const roleInfo = getRoleInfo(member.role);
                    const isOwner = isCreator(member);
                    const Icon = roleInfo.icon;

                    return (
                      <div
                        key={`${member.userId._id}-${index}`}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                            {member.userId.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.userId.avatar}
                                alt={`${member.userId.firstName} ${member.userId.lastName}`}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-600 dark:text-gray-300 font-medium">
                                {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                              </span>
                            )}
                          </div>

                          {/* Member Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                  {member.userId.firstName} {member.userId.lastName}
                                  {isOwner && <span className="ml-1">👑</span>}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  Member since {new Date(member.joinedAt).toLocaleDateString()}
                                </p>
                              </div>

                              {/* Role Controls */}
                              <div className="flex flex-col items-end gap-2 ml-4">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  <select
                                    value={member.role}
                                    onChange={(e) => onUpdateMemberRole(member.userId._id, e.target.value)}
                                    disabled={isOwner}
                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                  >
                                    {boardRoles.map((role) => (
                                      <option key={role.value} value={role.value}>
                                        {role.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {!isOwner && (
                                  <button
                                    onClick={() => onRemoveMember(member.userId._id)}
                                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Permissions */}
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-1">
                                {roleInfo.permissions.map((permission, permIndex) => (
                                  <span
                                    key={`${member.userId._id}-${permission}-${permIndex}`}
                                    className="px-2 py-1 bg-white dark:bg-gray-600 text-xs text-gray-600 dark:text-gray-300 rounded border"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Members Panel */}
            <div className="w-96 p-6 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Add New Members
              </h3>

              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Role for New Members
                </label>
                <div className="space-y-2">
                  {boardRoles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        onClick={() => setSelectedRole(role.value)}
                        className={`w-full flex flex-col items-start gap-2 p-3 rounded-lg border text-sm transition-colors ${
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
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Users */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Available Users */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {availableUsers.length === 0 ? (
                      <p>All users are already members</p>
                    ) : (
                      <p>No users found matching &quot;{searchTerm}&quot;</p>
                    )}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {user.firstName} {user.lastName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {user.email}
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
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
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

export default BoardMembersModal;