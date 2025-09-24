'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Calendar,
  Activity,
  Edit,
  Settings,
  Eye
} from 'lucide-react';
import IntegratedKanbanBoard from './IntegratedKanbanBoard';
import { projectService, Project, UserRole } from '@/lib/projectService';
import { activityService, Activity as ActivityType } from '@/lib/activityService';
import { useAuth } from '@/hooks/useAuth';

type ViewMode = 'overview' | 'boards' | 'activity' | 'settings';

interface ProjectDetailProps {
  projectId: string;
  userRole: UserRole;
  baseUrl: string;
}

export default function ProjectDetail({ projectId, userRole, baseUrl }: ProjectDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectData, projectActivities] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectActivities(projectId, { limit: 20 })
      ]);

      setProject(projectData);
      setActivities(projectActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`${baseUrl}/project-management`);
  };

  const handleEdit = () => {
    router.push(`${baseUrl}/project-management/projects/${projectId}/edit`);
  };

  const handleMembersManagement = () => {
    router.push(`${baseUrl}/project-management/projects/${projectId}/members`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <Eye size={32} className="text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Project</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Eye size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Not Found</h3>
        <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  // Permission checks
  const canEdit = projectService.canUserEditProject(userRole, project, user?.id || '');
  const canManageMembers = projectService.canUserManageProjectMembers(userRole, project, user?.id || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

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
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">{project.description || 'No description provided'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canManageMembers && (
            <button
              onClick={handleMembersManagement}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Users size={16} />
              <span>Manage Members</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit size={16} />
              <span>Edit Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Priority</p>
              <p className={`text-lg font-semibold capitalize ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Progress</p>
              <p className="text-lg font-semibold text-gray-900">{project.completionPercentage}%</p>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="text-lg font-semibold text-gray-900">{project.members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Due Date</p>
              <p className={`text-lg font-semibold ${project.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
              </p>
            </div>
          </div>
          {project.isOverdue && (
            <p className="text-xs text-red-600 mt-1">Overdue</p>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('boards')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'boards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Boards
          </button>
          <button
            onClick={() => setViewMode('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              viewMode === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Activity
          </button>
        </nav>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Start Date</p>
                  <p className="text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">End Date</p>
                  <p className="text-gray-900">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Budget</p>
                  <p className="text-gray-900">{project.budget.currency} {project.budget.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Estimated Hours</p>
                  <p className="text-gray-900">{project.estimatedHours}h</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Visibility</p>
                  <p className="text-gray-900 capitalize">{project.visibility}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Owner</p>
                  <p className="text-gray-900">{project.owner ? `${project.owner.firstName} ${project.owner.lastName}` : 'Unknown'}</p>
                </div>
              </div>

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-gray-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Team Members */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                {canManageMembers && (
                  <button
                    onClick={handleMembersManagement}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Manage
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {project.members.filter(m => m.user).map((member) => (
                  <div key={member._id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                      {member.user ? `${member.user.firstName[0]}${member.user.lastName[0]}` : '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">{member.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
                {project.members.filter(m => m.user).length === 0 && (
                  <p className="text-sm text-gray-500">No team members assigned</p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity._id} className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-full text-xs ${activityService.getActivityColor(activity.type)}`}>
                      {activityService.getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {activityService.formatActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activityService.formatTimeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'boards' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <IntegratedKanbanBoard projectId={projectId} />
        </div>
      )}

      {viewMode === 'activity' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Activity</h3>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity._id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className={`p-2 rounded-full text-sm ${activityService.getActivityColor(activity.type)}`}>
                  {activityService.getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    {activityService.formatActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activityService.formatTimeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8">
                <Activity size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No activity recorded for this project</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}