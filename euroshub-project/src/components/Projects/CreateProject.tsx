'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, DollarSign, Tag, AlertCircle, Users, Plus, X, Trello } from 'lucide-react';
import { projectService, CreateProjectRequest, ProjectRole, AddMemberRequest, UserRole } from '@/lib/projectService';
import { userService, User } from '@/lib/userService';
import { boardService, CreateBoardRequest } from '@/lib/boardService';
import { useAuth } from '@/hooks/useAuth';

interface CreateProjectProps {
  userRole: UserRole;
  baseUrl: string;
}

export default function CreateProject({ userRole, baseUrl }: CreateProjectProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    priority: 'medium',
    budget: {
      amount: 0,
      currency: 'USD'
    },
    tags: [],
    visibility: 'team',
    estimatedHours: 0
  });

  const [newTag, setNewTag] = useState('');

  // Members and boards state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Array<{userId: string, role: ProjectRole}>>([]);
  const [boards, setBoards] = useState<Array<{title: string, description: string, color: string}>>([]);
  const [newBoard, setNewBoard] = useState({title: '', description: '', color: '#3B82F6'});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await userService.getUsers();
      // Filter users based on role permissions
      let filteredUsers = usersData;
      if (userRole === 'hr') {
        // HR can see employees and clients
        filteredUsers = usersData.filter(u => ['employee', 'client'].includes(u.role));
      } else if (userRole === 'admin') {
        // Admin can see all users except superadmin
        filteredUsers = usersData.filter(u => u.role !== 'superadmin');
      }
      // Superadmin can see all users (no filtering)
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleInputChange = (field: keyof CreateProjectRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBudgetChange = (field: 'amount' | 'currency', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      budget: { ...prev.budget!, [field]: value }
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const addMember = (userId: string, role: ProjectRole) => {
    if (!selectedMembers.find(m => m.userId === userId)) {
      setSelectedMembers(prev => [...prev, { userId, role }]);
    }
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const updateMemberRole = (userId: string, role: ProjectRole) => {
    setSelectedMembers(prev =>
      prev.map(m => m.userId === userId ? { ...m, role } : m)
    );
  };

  const addBoard = () => {
    if (newBoard.title.trim()) {
      setBoards(prev => [...prev, newBoard]);
      setNewBoard({title: '', description: '', color: '#3B82F6'});
    }
  };

  const removeBoard = (index: number) => {
    setBoards(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create project
      const project = await projectService.createProject(formData);

      // Add members
      for (const member of selectedMembers) {
        try {
          await projectService.addMember(project._id, {
            userId: member.userId,
            role: member.role
          });
        } catch (err) {
          console.error('Failed to add member:', err);
        }
      }

      // Create boards
      for (const board of boards) {
        try {
          await boardService.createBoard(project._id, {
            title: board.title,
            description: board.description,
            color: board.color,
            createDefaultLists: true
          });
        } catch (err) {
          console.error('Failed to create board:', err);
        }
      }

      router.push(`${baseUrl}/project-management`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const canAssignRole = (role: ProjectRole): boolean => {
    switch (userRole) {
      case 'superadmin':
        return true;
      case 'admin':
        return ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'].includes(role);
      case 'hr':
        return ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'].includes(role);
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push(`${baseUrl}/project-management`)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
            <p className="text-gray-600">Set up a new project with team members and initial boards</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter project title"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the project goals and objectives"
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  id="startDate"
                  required
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours
              </label>
              <input
                type="number"
                id="estimatedHours"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="budgetAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Budget Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  id="budgetAmount"
                  min="0"
                  step="0.01"
                  value={formData.budget?.amount || 0}
                  onChange={(e) => handleBudgetChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={formData.budget?.currency || 'USD'}
                onChange={(e) => handleBudgetChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="PKR">PKR</option>
              </select>
            </div>

            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                id="visibility"
                value={formData.visibility}
                onChange={(e) => handleInputChange('visibility', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="private">Private</option>
                <option value="team">Team</option>
                <option value="company">Company</option>
              </select>
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a tag"
                  />
                </div>
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Users size={20} />
            <span>Team Members</span>
          </h2>

          <div className="space-y-4">
            {selectedMembers.map((member) => {
              const memberUser = users.find(u => u.id === member.userId);
              return (
                <div key={member.userId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                      {memberUser ? `${memberUser.firstName[0]}${memberUser.lastName[0]}` : '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {memberUser ? `${memberUser.firstName} ${memberUser.lastName}` : 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">{memberUser?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.userId, e.target.value as ProjectRole)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {canAssignRole('project_manager') && <option value="project_manager">Project Manager</option>}
                      {canAssignRole('developer') && <option value="developer">Developer</option>}
                      {canAssignRole('designer') && <option value="designer">Designer</option>}
                      {canAssignRole('tester') && <option value="tester">Tester</option>}
                      {canAssignRole('viewer') && <option value="viewer">Viewer</option>}
                      {canAssignRole('client_viewer') && <option value="client_viewer">Client Viewer</option>}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMember(member.userId)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addMember(e.target.value, 'developer');
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a team member to add</option>
                {users
                  .filter(user => !selectedMembers.find(m => m.userId === user.id))
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>

        {/* Initial Boards */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Trello size={20} />
            <span>Initial Boards</span>
          </h2>

          <div className="space-y-4">
            {boards.map((board, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: board.color }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{board.title}</p>
                    {board.description && <p className="text-sm text-gray-600">{board.description}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeBoard(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Board title"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, title: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="color"
                  value={newBoard.color}
                  onChange={(e) => setNewBoard(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="Board description (optional)"
                value={newBoard.description}
                onChange={(e) => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addBoard}
                disabled={!newBoard.title.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Board</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push(`${baseUrl}/project-management`)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>{loading ? 'Creating...' : 'Create Project'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}