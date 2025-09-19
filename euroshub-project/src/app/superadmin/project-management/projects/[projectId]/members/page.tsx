'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  Search,
  Crown,
  Users,
  Shield,
  Eye,
  Trash2,
  ChevronDown,
  Mail,
  Calendar,
  MoreVertical,
  Edit3,
  UserMinus
} from 'lucide-react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { projectService, Project, ProjectMember } from '@/lib/projectService';
import { userService, User } from '@/lib/userService';

type ProjectRole = 'project_manager' | 'developer' | 'designer' | 'tester' | 'viewer' | 'client_viewer';

interface RoleOption {
  value: ProjectRole;
  label: string;
  description: string;
  icon: any;
  color: string;
  permissions: string[];
}

const roleOptions: RoleOption[] = [
  {
    value: 'project_manager',
    label: 'Project Manager',
    description: 'Full access to project management and settings',
    icon: Crown,
    color: 'text-purple-600 bg-purple-100 border-purple-200',
    permissions: ['Manage members', 'Edit project', 'Delete tasks', 'View all']
  },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Can create/edit cards and boards',
    icon: Users,
    color: 'text-blue-600 bg-blue-100 border-blue-200',
    permissions: ['Create/edit tasks', 'Comment', 'View boards', 'Upload files']
  },
  {
    value: 'designer',
    label: 'Designer',
    description: 'Can create/edit cards and boards',
    icon: Users,
    color: 'text-green-600 bg-green-100 border-green-200',
    permissions: ['Create/edit tasks', 'Comment', 'View boards', 'Upload files']
  },
  {
    value: 'tester',
    label: 'Tester',
    description: 'Can create/edit cards and test-related tasks',
    icon: Shield,
    color: 'text-orange-600 bg-orange-100 border-orange-200',
    permissions: ['Create/edit tasks', 'Comment', 'View boards', 'Report bugs']
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Can only view project content',
    icon: Eye,
    color: 'text-gray-600 bg-gray-100 border-gray-200',
    permissions: ['View only', 'Add comments']
  },
  {
    value: 'client_viewer',
    label: 'Client Viewer',
    description: 'Limited view for external clients',
    icon: Eye,
    color: 'text-indigo-600 bg-indigo-100 border-indigo-200',
    permissions: ['Limited view', 'Add feedback']
  }
];

export default function ProjectMembers() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member modal state
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('developer');
  const [adding, setAdding] = useState(false);

  // Edit member modal state
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [showEditMember, setShowEditMember] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [projectData, usersData] = await Promise.all([
          projectService.getProject(projectId),
          userService.getUsers().catch(() => [])
        ]);

        setProject(projectData);
        setMembers(projectData.members);

        // Filter out users who are already members
        const memberUserIds = projectData.members.map(m => m.user._id);
        const available = usersData.filter(user => !memberUserIds.includes(user.id));
        setAvailableUsers(available);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleAddMember = async () => {
    if (!selectedUser || !project) return;

    try {
      setAdding(true);
      setError(null);

      const updatedMembers = await projectService.addMember(projectId, {
        userId: selectedUser.id,
        role: selectedRole
      });

      setMembers(updatedMembers);

      // Update available users
      setAvailableUsers(prev => prev.filter(user => user.id !== selectedUser.id));

      // Reset form
      setSelectedUser(null);
      setSelectedRole('developer');
      setShowAddMember(false);
      setSearchTerm('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: ProjectRole) => {
    try {
      setError(null);

      const updatedMembers = await projectService.updateMemberRole(projectId, memberId, {
        role: newRole
      });

      setMembers(updatedMembers);
      setShowEditMember(false);
      setEditingMember(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      setError(null);

      const updatedMembers = await projectService.removeMember(projectId, memberId);
      const removedMember = members.find(m => m._id === memberId);

      setMembers(updatedMembers);

      // Add the removed user back to available users if they still exist
      if (removedMember) {
        try {
          const allUsers = await userService.getUsers();
          const userStillExists = allUsers.find(u => u.id === removedMember.user._id);
          if (userStillExists) {
            setAvailableUsers(prev => [...prev, userStillExists]);
          }
        } catch (err) {
          console.warn('Failed to refresh available users:', err);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleInfo = (role: ProjectRole) => {
    return roleOptions.find(r => r.value === role) || roleOptions[1]; // Default to developer
  };

  if (loading) {
    return (
      <DashboardLayout
        role="superadmin"
        title="Loading..."
        showBreadcrumb={true}
        breadcrumbs={['Dashboard', 'Project Management', 'Members']}
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Project Members</h2>
          <p className="text-gray-600">Please wait while we load the member information...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !project) {
    return (
      <DashboardLayout
        role="superadmin"
        title="Error"
        showBreadcrumb={true}
        breadcrumbs={['Dashboard', 'Project Management', 'Members']}
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <div className="text-red-600 text-2xl">⚠</div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="superadmin"
      title={`${project.title} - Members`}
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', project.title, 'Members']}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Members</h1>
              <p className="text-gray-600 mt-1">Manage team members and their roles</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={16} />
            <span>Add Member</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members ({members.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {members.map((member) => {
              const roleInfo = getRoleInfo(member.role);
              const Icon = roleInfo.icon;

              return (
                <div key={member._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                        {member.user.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={`${member.user.firstName} ${member.user.lastName}`}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          `${member.user.firstName[0]}${member.user.lastName[0]}`
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">
                            {member.user.firstName} {member.user.lastName}
                          </h3>
                          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${roleInfo.color}`}>
                            <Icon size={14} />
                            <span>{roleInfo.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Mail size={14} />
                            <span>{member.user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setShowEditMember(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit role"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="mt-3 ml-16">
                    <div className="flex flex-wrap gap-2">
                      {roleInfo.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {members.length === 0 && (
              <div className="p-12 text-center">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
                <p className="text-gray-500 mb-4">Add team members to start collaborating on this project.</p>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add First Member
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddMember(false)} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
                <p className="text-gray-600 mt-1">Select a user and assign them a role</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Search Users */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Users
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search by name or email..."
                    />
                  </div>
                </div>

                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                          selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </button>
                    ))}

                    {filteredUsers.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        {searchTerm ? 'No users found matching your search' : 'No available users to add'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Selection */}
                {selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Role
                    </label>
                    <div className="space-y-2">
                      {roleOptions.map((role) => {
                        const Icon = role.icon;
                        return (
                          <button
                            key={role.value}
                            onClick={() => setSelectedRole(role.value)}
                            className={`w-full flex items-start space-x-3 p-4 border rounded-lg text-left transition-colors ${
                              selectedRole === role.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${role.color}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{role.label}</h4>
                              <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {role.permissions.map((permission) => (
                                  <span
                                    key={permission}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUser || adding}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Role Modal */}
        {showEditMember && editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditMember(false)} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Edit Member Role</h2>
                <p className="text-gray-600 mt-1">
                  Change role for {editingMember.user.firstName} {editingMember.user.lastName}
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-2">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        onClick={() => handleUpdateMemberRole(editingMember._id, role.value)}
                        className={`w-full flex items-start space-x-3 p-4 border rounded-lg text-left transition-colors ${
                          editingMember.role === role.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${role.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{role.label}</h4>
                          <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.map((permission) => (
                              <span
                                key={permission}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end">
                <button
                  onClick={() => setShowEditMember(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}