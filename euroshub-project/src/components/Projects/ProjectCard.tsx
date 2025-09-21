'use client';

import { useState } from 'react';
import {
  Calendar,
  Users,
  BarChart3,
  MoreHorizontal,
  Edit3,
  Trash2,
  UserPlus,
  Kanban,
  Clock,
  DollarSign,
  Flag,
  Star,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Project } from '@/types/project';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  viewMode: 'grid' | 'list';
  onUpdate: (projectId: string, updates: Partial<Project>) => void;
  onDelete: (projectId: string) => void;
  onManageMembers: (project: Project) => void;
  onOpenKanban: () => void;
  onViewDetails?: (projectId: string) => void;
}

const ProjectCard = ({
  project,
  viewMode,
  onUpdate,
  onDelete,
  onManageMembers,
  onOpenKanban,
  onViewDetails
}: ProjectCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    return <Flag className={`w-4 h-4 ${getPriorityColor(priority)}`} />;
  };

  const handleStarToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarred(!isStarred);
    // TODO: Implement star/favorite functionality
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={handleStarToggle}
              className={`p-1 rounded ${
                isStarred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
              }`}
            >
              <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.title}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
                {getPriorityIcon(project.priority)}
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>{project.members.length}</span>
            </div>

            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>{project.completionPercentage}%</span>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(project.startDate), 'MMM dd')}</span>
            </div>

            {project.budget.amount > 0 && (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>{formatCurrency(project.budget.amount, project.budget.currency)}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(project._id)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="View Project Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onOpenKanban}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Open Kanban Board"
              >
                <Kanban className="w-4 h-4" />
              </button>

              <button
                onClick={() => onManageMembers(project)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Manage Members"
              >
                <UserPlus className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        // TODO: Implement edit functionality
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Project</span>
                    </button>
                    <button
                      onClick={() => {
                        onDelete(project._id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Project</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <button
              onClick={handleStarToggle}
              className={`p-1 rounded ${
                isStarred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
              }`}
            >
              <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} />
            </button>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-1">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getPriorityIcon(project.priority)}

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      // TODO: Implement edit functionality
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Project</span>
                  </button>
                  <button
                    onClick={() => {
                      onDelete(project._id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Project</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ')}
          </span>

          {project.isOverdue && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
              Overdue
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="p-4 border-b border-gray-100">
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

      {/* Stats */}
      <div className="p-4 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{project.members.length} members</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <BarChart3 className="w-4 h-4" />
            <span>{project.metadata.totalTasks} tasks</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
          </div>
          {project.budget.amount > 0 && (
            <div className="flex items-center space-x-2 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>{formatCurrency(project.budget.amount, project.budget.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Team Avatars */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {project.members.slice(0, 4).map((member, index) => (
              <div
                key={member._id}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                title={member.user.name}
              >
                {member.user.name.split(' ').map(n => n[0]).join('')}
              </div>
            ))}
            {project.members.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                +{project.members.length - 4}
              </div>
            )}
          </div>

          <button
            onClick={() => onManageMembers(project)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4">
        <div className="flex space-x-2">
          <button
            onClick={onOpenKanban}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Kanban className="w-4 h-4" />
            <span>Open Board</span>
          </button>

          {onViewDetails && (
            <button
              onClick={() => onViewDetails(project._id)}
              className="flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="View Project Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onManageMembers(project)}
            className="flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Manage Members"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;