'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Mail, UserPlus, UserX, Shield, AlertCircle } from 'lucide-react';
import { projectService, Project, UserRole, ProjectMember, User } from '@/lib/projectService';
import { useAuth } from '@/hooks/useAuth';

interface ProjectMembersProps {
  projectId: string;
  userRole: UserRole;
  baseUrl: string;
}

export default function ProjectMembers({ projectId, userRole, baseUrl }: ProjectMembersProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'leader'>('member');

  useEffect(() => {
    if (projectId) {
      loadProjectAndUsers();
    }
  }, [projectId]);

  const loadProjectAndUsers = async () => {
    try {
      setDataLoading(true);
      const [projectData, usersData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getUsers()
      ]);

      // Check if user can manage members for this project
      if (!projectService.canUserManageMembers(userRole, projectData, user?.id || '')) {
        setError('You do not have permission to manage members for this project');
        return;
      }

      setProject(projectData);

      // Filter available users based on role permissions
      const filteredUsers = usersData.filter(u => {
        // Don't show users who are already members
        const isAlreadyMember = projectData.members.some(member => member.user._id === u._id) ||
                               projectData.owner._id === u._id ||
                               (projectData.client && projectData.client._id === u._id);

        if (isAlreadyMember) return false;

        // Role-based filtering
        if (userRole === 'superadmin') {
          return true; // Superadmin can add anyone
        } else if (userRole === 'admin') {
          return u.role !== 'superadmin'; // Admin cannot add superadmins
        } else if (userRole === 'hr') {
          return ['admin', 'hr', 'employee', 'client'].includes(u.role); // HR can add most roles
        } else {
          return false; // Other roles cannot add members
        }
      });

      setAvailableUsers(filteredUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    try {
      await projectService.addProjectMember(projectId, selectedUser, selectedRole);
      await loadProjectAndUsers(); // Reload data
      setShowAddModal(false);
      setSelectedUser('');
      setSelectedRole('member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    setLoading(true);
    setError(null);

    try {
      await projectService.removeProjectMember(projectId, memberId);
      await loadProjectAndUsers(); // Reload data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'member' | 'leader') => {
    setLoading(true);
    setError(null);

    try {
      await projectService.updateMemberRole(projectId, memberId, newRole);
      await loadProjectAndUsers(); // Reload data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`${baseUrl}/project-management/projects/${projectId}`);
  };

  const canManageMembers = project && projectService.canUserManageMembers(userRole, project, user?.id || '');
  const canAddMembers = canManageMembers && availableUsers.length > 0;

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading project members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Project
        </button>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Members</h1>
            <p className="text-gray-600">{project.title}</p>
          </div>
        </div>
        {canAddMembers && (
          <button
            onClick={() => setShowAddModal(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center space-x-2"
          >
            <UserPlus size={16} />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Project Owner */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Shield size={20} className="text-yellow-600" />
          <span>Project Owner</span>
        </h2>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-yellow-800 font-semibold text-lg">
              {project.owner?.name?.charAt(0)?.toUpperCase() || 'O'}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{project.owner?.name || 'Unknown'}</p>
            <p className="text-gray-600">{project.owner?.email || 'No email'}</p>
            <p className="text-sm text-yellow-600 capitalize">{project.owner?.role || 'owner'}</p>
          </div>
        </div>
      </div>

      {/* Project Client */}
      {project.client && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Mail size={20} className="text-green-600" />
            <span>Project Client</span>
          </h2>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-800 font-semibold text-lg">
                {project.client?.name?.charAt(0)?.toUpperCase() || 'C'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{project.client?.name || 'Unknown'}</p>
              <p className="text-gray-600">{project.client?.email || 'No email'}</p>
              <p className="text-sm text-green-600 capitalize">{project.client?.role || 'client'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Users size={20} />
          <span>Team Members ({project.members.length})</span>
        </h2>

        {project.members.length === 0 ? (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No team members added yet</p>
            {canAddMembers && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                Add the first member
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {project.members.map((member) => (
              <div key={member._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-800 font-semibold text-lg">
                      {member.user?.name?.charAt(0)?.toUpperCase() || 'M'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.user?.name || 'Unknown'}</p>
                    <p className="text-gray-600">{member.user?.email || 'No email'}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 capitalize">{member.user?.role || 'member'}</span>
                      <span className="text-gray-300">•</span>
                      <span className={`text-sm font-medium capitalize ${
                        member.role === 'leader' ? 'text-purple-600' : 'text-blue-600'
                      }`}>
                        {member.role === 'leader' ? 'Team Leader' : 'Team Member'}
                      </span>
                    </div>
                  </div>
                </div>

                {canManageMembers && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member._id, e.target.value as 'member' | 'leader')}
                      disabled={loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="leader">Leader</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={loading}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Remove member"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'member' | 'leader')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Team Member</option>
                  <option value="leader">Team Leader</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={loading || !selectedUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center space-x-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <UserPlus size={16} />
                <span>{loading ? 'Adding...' : 'Add Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}