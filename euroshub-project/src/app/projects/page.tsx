'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  BarChart3,
  FolderOpen,
  Settings,
  Star,
  Grid3X3,
  List as ListIcon
} from 'lucide-react';
import ProjectCard from '@/components/Projects/ProjectCard';
import CreateProjectModal from '@/components/Projects/CreateProjectModal';
import ProjectMemberManagement from '@/components/Projects/ProjectMemberManagement';
import KanbanBoard from '@/components/Projects/KanbanBoard';
import { Project, ProjectMember } from '@/types/project';
import { apiCall } from '@/lib/api';

interface ProjectFilters {
  status: string;
  priority: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const ProjectManagement = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<'grid' | 'list' | 'kanban'>('grid');
  const [filters, setFilters] = useState<ProjectFilters>({
    status: 'all',
    priority: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      params.append('sortBy', filters.sortBy);
      params.append('sortOrder', filters.sortOrder);

      const response = await apiCall(`/api/projects?${params.toString()}`);
      if (response.success) {
        setProjects(response.data);
      } else {
        setError(response.message || 'Failed to fetch projects');
      }
    } catch (err) {
      setError('Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new project
  const handleCreateProject = async (projectData: Partial<Project>) => {
    try {
      const response = await apiCall('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
      });

      if (response.success) {
        setProjects([response.data, ...projects]);
        setShowCreateModal(false);
      } else {
        setError(response.message || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
      console.error('Error creating project:', err);
    }
  };

  // Update project
  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const response = await apiCall(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (response.success) {
        setProjects(projects.map(p => p._id === projectId ? response.data : p));
      } else {
        setError(response.message || 'Failed to update project');
      }
    } catch (err) {
      setError('Failed to update project');
      console.error('Error updating project:', err);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiCall(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        setProjects(projects.filter(p => p._id !== projectId));
      } else {
        setError(response.message || 'Failed to delete project');
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error('Error deleting project:', err);
    }
  };

  // Manage project members
  const handleManageMembers = (project: Project) => {
    setSelectedProject(project);
    setShowMemberModal(true);
  };

  // Update project members
  const handleUpdateMembers = (updatedMembers: ProjectMember[]) => {
    if (selectedProject) {
      const updatedProject = { ...selectedProject, members: updatedMembers };
      setSelectedProject(updatedProject);
      setProjects(projects.map(p => p._id === selectedProject._id ? updatedProject : p));
    }
  };

  // Filter change handlers
  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  useEffect(() => {
    fetchProjects();
  }, [filters]);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  if (currentView === 'kanban' && selectedProject) {
    return (
      <KanbanBoard
        project={selectedProject}
        onBack={() => setCurrentView('grid')}
        onProjectUpdate={handleUpdateProject}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{projects.length} projects</span>
                <span>•</span>
                <span>{projects.filter(p => p.status === 'active').length} active</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    currentView === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`p-2 rounded-md transition-colors ${
                    currentView === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ListIcon size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <button
              onClick={() => handleSortChange('title')}
              className={`px-3 py-1 text-sm rounded ${
                filters.sortBy === 'title'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Name {filters.sortBy === 'title' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortChange('createdAt')}
              className={`px-3 py-1 text-sm rounded ${
                filters.sortBy === 'createdAt'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Date {filters.sortBy === 'createdAt' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortChange('priority')}
              className={`px-3 py-1 text-sm rounded ${
                filters.sortBy === 'priority'
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Priority {filters.sortBy === 'priority' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status !== 'all' || filters.priority !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first project.'
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Create Project
            </button>
          </div>
        ) : (
          <div className={
            currentView === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }>
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                viewMode={currentView}
                onUpdate={handleUpdateProject}
                onDelete={handleDeleteProject}
                onManageMembers={handleManageMembers}
                onOpenKanban={() => {
                  setSelectedProject(project);
                  setCurrentView('kanban');
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />
      )}

      {showMemberModal && selectedProject && (
        <ProjectMemberManagement
          project={selectedProject}
          onClose={() => {
            setShowMemberModal(false);
            setSelectedProject(null);
          }}
          onUpdateMembers={handleUpdateMembers}
        />
      )}
    </div>
  );
};

export default ProjectManagement;