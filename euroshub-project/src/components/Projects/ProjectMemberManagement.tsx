'use client';

import { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Search,
  Crown,
  Users,
  Shield,
  Eye,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project, ProjectMember, User } from '@/types/project';
import { usersApi, projectsApi } from '@/lib/api';

interface ProjectMemberManagementProps {
  project: Project;
  onClose: () => void;
  onUpdateMembers: (members: ProjectMember[]) => void;
}

const roleOptions = [
  {
    value: 'project_manager',
    label: 'Project Manager',
    description: 'Can manage project members, boards, and settings',
    icon: Crown,
    color: 'text-purple-600 bg-purple-100'
  },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Can create/edit cards and boards',
    icon: Users,
    color: 'text-blue-600 bg-blue-100'
  },
  {
    value: 'designer',
    label: 'Designer',
    description: 'Can create/edit cards and boards',
    icon: Users,
    color: 'text-green-600 bg-green-100'
  },
  {
    value: 'tester',
    label: 'Tester',
    description: 'Can create/edit cards and boards',
    icon: Shield,
    color: 'text-orange-600 bg-orange-100'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Can only view project content',
    icon: Eye,
    color: 'text-gray-600 bg-gray-100'
  },
  {
    value: 'client_viewer',
    label: 'Client Viewer',
    description: 'Limited view for external clients',
    icon: Eye,
    color: 'text-indigo-600 bg-indigo-100'
  }
];

// Sortable member item component
const SortableMemberItem = ({ member, onRoleChange, onRemove, canManage }: {
  member: ProjectMember;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string) => void;
  canManage: boolean;
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const roleInfo = roleOptions.find(r => r.value === member.role);
  const Icon = roleInfo?.icon || Users;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white border border-gray-200 rounded-lg p-4 ${
        isDragging ? 'shadow-lg opacity-50' : 'hover:shadow-md'
      } transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Drag Handle */}
          {canManage && (
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="7" cy="5" r="1" />
                <circle cx="13" cy="5" r="1" />
                <circle cx="7" cy="10" r="1" />
                <circle cx="13" cy="10" r="1" />
                <circle cx="7" cy="15" r="1" />
                <circle cx="13" cy="15" r="1" />
              </svg>
            </div>
          )}

          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
            {member.user.name.split(' ').map(n => n[0]).join('')}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{member.user.name}</h4>
            <p className="text-sm text-gray-600 truncate">{member.user.email}</p>
            <p className="text-xs text-gray-500">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Role Badge */}
          <div className="relative">
            <button
              onClick={() => canManage && setShowRoleMenu(!showRoleMenu)}
              disabled={!canManage}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleInfo?.color || 'text-gray-600 bg-gray-100'
              } ${canManage ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
            >
              <Icon size={16} />
              <span>{roleInfo?.label || member.role}</span>
              {canManage && <ChevronDown size={14} />}
            </button>

            {/* Role Selection Dropdown */}
            {showRoleMenu && canManage && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 space-y-1">
                  {roleOptions.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <button
                        key={role.value}
                        onClick={() => {
                          onRoleChange(member._id, role.value);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                          member.role === role.value ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded ${role.color}`}>
                            <RoleIcon size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{role.label}</div>
                            <div className="text-sm text-gray-600">{role.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Remove Button */}
        {canManage && member.role !== 'project_manager' && (
          <button
            onClick={() => onRemove(member._id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove member"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const ProjectMemberManagement = ({ project, onClose, onUpdateMembers }: ProjectMemberManagementProps) => {
  const [members, setMembers] = useState<ProjectMember[]>(project.members);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('developer');
  const [showAddMember, setShowAddMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch available users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersApi.getUsers();
        if (response.success) {
          // Filter out users who are already members
          const memberUserIds = members.map(m => m.user._id);
          const available = response.data.filter((user: User) =>
            !memberUserIds.includes(user._id) && user.role !== 'superadmin'
          );
          setAvailableUsers(available);
        }
      } catch (err) {
        setError('Failed to fetch users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [members]);

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = members.findIndex(m => m._id === active.id);
      const newIndex = members.findIndex(m => m._id === over.id);

      const newMembers = arrayMove(members, oldIndex, newIndex);
      setMembers(newMembers);
      onUpdateMembers(newMembers);
    }
  };

  // Add new member
  const handleAddMember = async (userId: string) => {
    try {
      setLoading(true);
      const response = await projectsApi.addMember(project._id, {
        userId,
        role: selectedRole
      });

      if (response.success) {
        const newMember = response.data;
        const updatedMembers = [...members, newMember];
        setMembers(updatedMembers);
        onUpdateMembers(updatedMembers);

        // Remove user from available users
        setAvailableUsers(availableUsers.filter(u => u._id !== userId));
        setShowAddMember(false);
        setSearchTerm('');
      } else {
        setError(response.message || 'Failed to add member');
      }
    } catch (err) {
      setError('Failed to add member');
      console.error('Error adding member:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update member role
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      setLoading(true);
      const response = await projectsApi.updateMemberRole(project._id, memberId, { role: newRole });

      if (response.success) {
        const updatedMembers = members.map(m =>
          m._id === memberId ? { ...m, role: newRole as any } : m
        );
        setMembers(updatedMembers);
        onUpdateMembers(updatedMembers);
      } else {
        setError(response.message || 'Failed to update role');
      }
    } catch (err) {
      setError('Failed to update role');
      console.error('Error updating role:', err);
    } finally {
      setLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await projectsApi.removeMember(project._id, memberId);

      if (response.success) {
        const removedMember = members.find(m => m._id === memberId);
        const updatedMembers = members.filter(m => m._id !== memberId);
        setMembers(updatedMembers);
        onUpdateMembers(updatedMembers);

        // Add user back to available users if they exist
        if (removedMember) {
          setAvailableUsers([...availableUsers, removedMember.user]);
        }
      } else {
        setError(response.message || 'Failed to remove member');
      }
    } catch (err) {
      setError('Failed to remove member');
      console.error('Error removing member:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter available users based on search
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if current user can manage members
  const canManageMembers = true; // TODO: Implement proper permission checking

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
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Team Members</h2>
              <p className="text-sm text-gray-500">{project.title}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={16} />
              <span>Add Member</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Add Member Section */}
        {showAddMember && (
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Member</h3>

            <div className="flex space-x-4 mb-4">
              {/* Search Users */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role Selection */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Available Users List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No users found matching your search.' : 'No available users to add.'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddMember(user._id)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Current Members */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Current Members ({members.length})
            </h3>
            {canManageMembers && (
              <div className="text-sm text-gray-600">
                Drag members to reorder
              </div>
            )}
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
              <p className="text-gray-600">Add team members to start collaborating on this project.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={members.map(m => m._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {members.map((member) => (
                    <SortableMemberItem
                      key={member._id}
                      member={member}
                      onRoleChange={handleRoleChange}
                      onRemove={handleRemoveMember}
                      canManage={canManageMembers}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {members.length} member{members.length !== 1 ? 's' : ''} in this project
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMemberManagement;