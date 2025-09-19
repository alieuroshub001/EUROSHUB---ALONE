'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Calendar,
  Columns,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive} from 'lucide-react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { projectService, Project, ProjectFilters, ProjectStatus, ProjectPriority } from '../../../lib/projectService';
import { activityService, Activity } from '../../../lib/activityService';
import { useAuth } from '../../../hooks/useAuth';

interface ProjectCardProps {
  project: Project;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

interface KanbanCardProps extends ProjectCardProps {
  onDragStart?: (project: Project) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

// Kanban Card Component
const KanbanCard: React.FC<KanbanCardProps> = ({
  project,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onDragStart,
  onDragEnd,
  isDragging = false
}) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'border-green-400';
      case 'planning': return 'border-blue-400';
      case 'on_hold': return 'border-yellow-400';
      case 'completed': return 'border-purple-400';
      case 'cancelled': return 'border-red-400';
      default: return 'border-gray-400';
    }
  };

  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 ${getStatusColor(project.status)} p-4 mb-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
      draggable="true"
      onDragStart={(e) => {
        onDragStart?.(project);
      }}
      onDragEnd={() => {
        onDragEnd?.();
      }}
    >
      {/* Priority indicator */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-3 h-3 rounded-full ${getPriorityColor(project.priority)}`}></div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(project._id);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 rounded"
            title="View project"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>

      {/* Project Title */}
      <h3
        className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm cursor-pointer"
        onClick={() => onView(project._id)}
      >
        {project.title}
      </h3>

      {/* Project Description */}
      {project.description && (
        <p className="text-gray-600 text-xs line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      {/* Project Meta */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Users size={12} />
            <span>{project.members.filter(m => m.user).length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar size={12} />
            <span>{project.metadata.totalTasks}</span>
          </div>
        </div>
      </div>

      {/* Team Members Avatars */}
      {project.members.filter(m => m.user).length > 0 && (
        <div className="flex -space-x-2 mb-2">
          {project.members.filter(m => m.user).slice(0, 3).map((member) => (
            <div
              key={member._id}
              className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
              title={member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User'}
            >
              {member.user?.avatar ? (
                <img
                  src={member.user.avatar}
                  alt={member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                member.user ? `${member.user.firstName[0]}${member.user.lastName[0]}` : '?'
              )}
            </div>
          ))}
          {project.members.filter(m => m.user).length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              +{project.members.filter(m => m.user).length - 3}
            </div>
          )}
        </div>
      )}

      {/* Due Date */}
      {project.endDate && (
        <div className={`text-xs px-2 py-1 rounded ${
          project.isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        }`}>
          Due: {new Date(project.endDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onView,
  onEdit,
  onDelete,
  onArchive
}) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100 border-green-200';
      case 'planning': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'on_hold': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'completed': return 'text-purple-700 bg-purple-100 border-purple-200';
      case 'cancelled': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {project.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2">
            {project.description || 'No description available'}
          </p>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ').toUpperCase()}
          </span>

          <div className="relative">
            <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Users size={16} />
            <span>{project.members.length} members</span>
          </div>

          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>{project.metadata.totalTasks} tasks</span>
          </div>

          <div className={`flex items-center space-x-1 ${getPriorityColor(project.priority)}`}>
            <AlertCircle size={16} />
            <span>{project.priority}</span>
          </div>
        </div>

        <div className="flex -space-x-2">
          {project.members.slice(0, 3).filter(member => member.user).map((member) => (
            <div
              key={member._id}
              className="w-8 h-8 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
              title={member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User'}
            >
              {member.user?.avatar ? (
                <img
                  src={member.user.avatar}
                  alt={member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Unknown User'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                member.user ? `${member.user.firstName[0]}${member.user.lastName[0]}` : '?'
              )}
            </div>
          ))}
          {project.members.filter(member => member.user).length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              +{project.members.filter(member => member.user).length - 3}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{project.completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${project.completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Due: {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
          {project.isOverdue && (
            <span className="ml-2 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
              Overdue
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(project._id)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View project"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onEdit(project._id)}
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Edit project"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onArchive(project._id)}
            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
            title="Archive project"
          >
            <Archive size={16} />
          </button>
          <button
            onClick={() => onDelete(project._id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SuperAdminProjectManagement() {
  const router = useRouter();
  useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Drag and drop state
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load projects and activities in parallel
      const [projectsResult, activitiesResult] = await Promise.all([
        projectService.getProjects({ ...filters, search: searchTerm }),
        activityService.getDashboardActivities({ limit: 10 })
      ]);

      setProjects(projectsResult.data);
      setActivities(activitiesResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  const handleFilterChange = (key: keyof ProjectFilters, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/superadmin/project-management/projects/${projectId}`);
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/superadmin/project-management/projects/${projectId}/edit`);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await projectService.deleteProject(projectId);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete project');
      }
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      await projectService.archiveProject(projectId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project');
    }
  };

  const handleCreateProject = () => {
    router.push('/superadmin/project-management/create');
  };

  // Drag and drop handlers
  const handleDragStart = (project: Project) => {
    setDraggedProject(project);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ProjectStatus) => {
    e.preventDefault();

    if (!draggedProject || draggedProject.status === newStatus) {
      setDraggedProject(null);
      setDragOverColumn(null);
      return;
    }

    try {
      // Update project status
      await projectService.updateProject(draggedProject._id, { status: newStatus });

      // Update local state immediately for better UX
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project._id === draggedProject._id
            ? { ...project, status: newStatus }
            : project
        )
      );

      // Reload data to get updated metadata
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project status');
    }

    setDraggedProject(null);
    setDragOverColumn(null);
  };

  const content = (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Grid3X3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-3xl font-bold text-green-600">
                {projects.filter(p => p.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-purple-600">
                {projects.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600">
                {projects.filter(p => p.isOverdue).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className={viewMode === 'kanban' ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-4 gap-8'}>
        {/* Main Content */}
        <div className={viewMode === 'kanban' ? 'w-full' : 'lg:col-span-3'}>
          {/* Filters and Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
              <button
                onClick={handleCreateProject}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>New Project</span>
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </form>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={filters.priority || ''}
                  onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

                <select
                  value={filters.sortBy || 'createdAt'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="title">Name</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="endDate">Due Date</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="List View"
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Kanban View"
                >
                  <Columns size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="text-red-600" size={20} />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {loading && projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Projects</h2>
              <p className="text-gray-600">Please wait while we load your projects...</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="flex space-x-6 overflow-x-auto pb-6">
              {/* Planning Column */}
              <div className="flex-shrink-0 w-80">
                <div
                  className={`bg-gray-100 rounded-lg p-4 transition-all ${
                    dragOverColumn === 'planning' ? 'bg-blue-100 border-2 border-dashed border-blue-400' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'planning')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'planning')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      Planning
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {projects.filter(p => p.status === 'planning').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-screen overflow-y-auto">
                    {projects.filter(p => p.status === 'planning').map((project) => (
                      <KanbanCard
                        key={project._id}
                        project={project}
                        onView={handleViewProject}
                        onEdit={handleEditProject}
                        onDelete={handleDeleteProject}
                        onArchive={handleArchiveProject}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedProject?._id === project._id}
                      />
                    ))}
                    {projects.filter(p => p.status === 'planning').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No projects in planning</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Column */}
              <div className="flex-shrink-0 w-80">
                <div
                  className={`bg-gray-100 rounded-lg p-4 transition-all ${
                    dragOverColumn === 'active' ? 'bg-green-100 border-2 border-dashed border-green-400' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'active')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'active')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      Active
                    </h3>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      {projects.filter(p => p.status === 'active').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-screen overflow-y-auto">
                    {projects.filter(p => p.status === 'active').map((project) => (
                      <KanbanCard
                        key={project._id}
                        project={project}
                        onView={handleViewProject}
                        onEdit={handleEditProject}
                        onDelete={handleDeleteProject}
                        onArchive={handleArchiveProject}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedProject?._id === project._id}
                      />
                    ))}
                    {projects.filter(p => p.status === 'active').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No active projects</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* On Hold Column */}
              <div className="flex-shrink-0 w-80">
                <div
                  className={`bg-gray-100 rounded-lg p-4 transition-all ${
                    dragOverColumn === 'on_hold' ? 'bg-yellow-100 border-2 border-dashed border-yellow-400' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'on_hold')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'on_hold')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      On Hold
                    </h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                      {projects.filter(p => p.status === 'on_hold').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-screen overflow-y-auto">
                    {projects.filter(p => p.status === 'on_hold').map((project) => (
                      <KanbanCard
                        key={project._id}
                        project={project}
                        onView={handleViewProject}
                        onEdit={handleEditProject}
                        onDelete={handleDeleteProject}
                        onArchive={handleArchiveProject}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedProject?._id === project._id}
                      />
                    ))}
                    {projects.filter(p => p.status === 'on_hold').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No projects on hold</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Completed Column */}
              <div className="flex-shrink-0 w-80">
                <div
                  className={`bg-gray-100 rounded-lg p-4 transition-all ${
                    dragOverColumn === 'completed' ? 'bg-purple-100 border-2 border-dashed border-purple-400' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'completed')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'completed')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      Completed
                    </h3>
                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                      {projects.filter(p => p.status === 'completed').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-screen overflow-y-auto">
                    {projects.filter(p => p.status === 'completed').map((project) => (
                      <KanbanCard
                        key={project._id}
                        project={project}
                        onView={handleViewProject}
                        onEdit={handleEditProject}
                        onDelete={handleDeleteProject}
                        onArchive={handleArchiveProject}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedProject?._id === project._id}
                      />
                    ))}
                    {projects.filter(p => p.status === 'completed').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No completed projects</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cancelled Column */}
              <div className="flex-shrink-0 w-80">
                <div
                  className={`bg-gray-100 rounded-lg p-4 transition-all ${
                    dragOverColumn === 'cancelled' ? 'bg-red-100 border-2 border-dashed border-red-400' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'cancelled')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'cancelled')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      Cancelled
                    </h3>
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {projects.filter(p => p.status === 'cancelled').length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-screen overflow-y-auto">
                    {projects.filter(p => p.status === 'cancelled').map((project) => (
                      <KanbanCard
                        key={project._id}
                        project={project}
                        onView={handleViewProject}
                        onEdit={handleEditProject}
                        onDelete={handleDeleteProject}
                        onArchive={handleArchiveProject}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedProject?._id === project._id}
                      />
                    ))}
                    {projects.filter(p => p.status === 'cancelled').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No cancelled projects</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
              : 'space-y-4'
            }>
              {projects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onView={handleViewProject}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onArchive={handleArchiveProject}
                />
              ))}
            </div>
          )}

          {projects.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <Grid3X3 size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filters.status || filters.priority
                  ? 'Try adjusting your search or filters'
                  : 'Create your first project to get started'
                }
              </p>
              {!searchTerm && !filters.status && !filters.priority && (
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Project
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Hidden in Kanban view */}
        {viewMode !== 'kanban' && (
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
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
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
        )}
      </div>      
    </>
  );

  return (
    <DashboardLayout
      role="superadmin"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      {content}
    </DashboardLayout>
  );
}