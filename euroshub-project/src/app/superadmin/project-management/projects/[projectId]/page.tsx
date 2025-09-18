'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Activity,
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  Plus,
  Star
} from 'lucide-react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import IntegratedKanbanBoard from '../../../../../components/Projects/IntegratedKanbanBoard';
import { projectService, Project } from '../../../../../lib/projectService';
import { activityService, Activity as ActivityType } from '../../../../../lib/activityService';

type ViewMode = 'overview' | 'boards' | 'activity' | 'settings';

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

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

  const handleEditProject = () => {
    router.push(`/superadmin/project-management/projects/${projectId}/edit`);
  };

  const handleArchiveProject = async () => {
    if (!project) return;

    try {
      await projectService.archiveProject(projectId);
      await loadProjectData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await projectService.deleteProject(projectId);
        router.push('/superadmin/project-management');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete project');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        role="superadmin"
        title="Loading Project..."
        showBreadcrumb={true}
        breadcrumbs={['Dashboard', 'Project Management', 'Loading...']}
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Project</h2>
          <p className="text-gray-600">Please wait while we load the project details...</p>
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
        breadcrumbs={['Dashboard', 'Project Management', 'Error']}
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <div className="text-red-600 text-2xl">⚠</div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-4">{error || 'Project not found'}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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

  const renderContent = () => {
    switch (viewMode) {
      case 'boards':
        return <IntegratedKanbanBoard projectId={projectId} userRole="superadmin" />;

      case 'activity':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Activity</h3>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity._id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full text-sm ${activityService.getActivityColor(activity.type)}`}>
                    {activityService.getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
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
                <p className="text-center text-gray-500 py-8">No activity yet</p>
              )}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Settings</h3>
            <p className="text-gray-600">Project settings and configuration options will be available here.</p>
          </div>
        );

      default: // overview
        return (
          <div className="space-y-6">
            {/* Project Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                    <p className="text-3xl font-bold text-gray-900">{project.metadata.totalTasks}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{project.metadata.completedTasks}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Team Members</p>
                    <p className="text-3xl font-bold text-purple-600">{project.members.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Progress</p>
                    <p className="text-3xl font-bold text-indigo-600">{project.completionPercentage}%</p>
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Activity className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                  <p className="text-gray-600">
                    {project.description || 'No description provided.'}
                  </p>
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
                      <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Project Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Info</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status</span>
                      <div className="mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-500">Priority</span>
                      <div className={`mt-1 text-sm font-medium ${getPriorityColor(project.priority)}`}>
                        {project.priority.toUpperCase()}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-500">Start Date</span>
                      <div className="mt-1 text-sm text-gray-900">
                        {new Date(project.startDate).toLocaleDateString()}
                      </div>
                    </div>

                    {project.endDate && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">End Date</span>
                        <div className="mt-1 text-sm text-gray-900">
                          {new Date(project.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {project.budget && project.budget.amount > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Budget</span>
                        <div className="mt-1 text-sm text-gray-900">
                          {project.budget.currency} {project.budget.amount.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
                  <div className="space-y-3">
                    {project.members.map((member) => (
                      <div key={member._id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {member.user.firstName} {member.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{member.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}

                    {project.members.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">No team members</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout
      role="superadmin"
      title={project.title}
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', project.title]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-1">
                {project.description || 'Project management and tracking'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleEditProject}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>

            <div className="relative">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('boards')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'boards'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Boards
            </button>
            <button
              onClick={() => setViewMode('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setViewMode('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}