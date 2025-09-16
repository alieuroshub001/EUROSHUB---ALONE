'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Calendar,
  Users,
  Clock,
  MoreHorizontal,
  Star,
  Eye,
  Edit,
  Archive,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/hooks/useAuth';

interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  owner: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  members: Array<{
    user: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    role: string;
  }>;
  dueDate?: string;
  createdAt: string;
  boardCount: number;
  memberCount: number;
  isOverdue: boolean;
}

interface ProjectCardProps {
  project: Project;
  viewMode: 'grid' | 'list';
  onUpdate: () => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusColors = {
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  'on-hold': 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function ProjectCard({ project, viewMode, onUpdate }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleViewProject = () => {
    // Navigate to role-specific project page
    const rolePrefix = user?.role === 'superadmin' ? '/superadmin' :
                       user?.role === 'admin' ? '/admin' :
                       user?.role === 'client' ? '/client' :
                       user?.role === 'hr' ? '/hr' : '/employee';
    router.push(`${rolePrefix}/projects/${project._id}`);
  };

  const handleStarProject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarred(!isStarred);
    // TODO: Implement star functionality
  };

  const handleArchiveProject = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${project._id}/archive`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        onUpdate();
      } else {
        console.error('Failed to archive project');
      }
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                  onClick={handleViewProject}
                >
                  {project.name}
                </h3>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[project.status])}>
                  {project.status}
                </span>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', priorityColors[project.priority])}>
                  {project.priority}
                </span>
                {project.isOverdue && (
                  <div className="flex items-center text-red-500">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Overdue</span>
                  </div>
                )}
              </div>
              {project.description && (
                <p className="text-gray-600 text-sm mt-1 line-clamp-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{project.memberCount}</span>
            </div>

            <div className="flex items-center space-x-1">
              <Eye className="w-4 h-4" />
              <span>{project.boardCount}</span>
            </div>

            {project.dueDate && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(project.dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}

            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{format(new Date(project.createdAt), 'MMM d')}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleStarProject}
                className={clsx(
                  'p-1 rounded hover:bg-gray-100',
                  isStarred ? 'text-yellow-500' : 'text-gray-400'
                )}
              >
                <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        handleViewProject();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Project</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // TODO: Implement edit
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        handleArchiveProject();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
         onClick={handleViewProject}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{project.description}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleStarProject}
            className={clsx(
              'p-1 rounded hover:bg-gray-100',
              isStarred ? 'text-yellow-500' : 'text-gray-400'
            )}
          >
            <Star className="w-4 h-4" fill={isStarred ? 'currentColor' : 'none'} />
          </button>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProject();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Project</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveProject();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status and Priority Tags */}
      <div className="flex items-center space-x-2 mb-4">
        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', statusColors[project.status])}>
          {project.status}
        </span>
        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', priorityColors[project.priority])}>
          {project.priority}
        </span>
        {project.isOverdue && (
          <div className="flex items-center text-red-500">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">Overdue</span>
          </div>
        )}
      </div>

      {/* Owner */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
          {project.owner.avatar ? (
            <img src={project.owner.avatar} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <span className="text-xs text-gray-600">
              {project.owner.firstName[0]}{project.owner.lastName[0]}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-700">
          {project.owner.firstName} {project.owner.lastName}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{project.memberCount}</span>
          </div>

          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{project.boardCount} boards</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {project.dueDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(project.dueDate), 'MMM d')}</span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(project.createdAt), 'MMM d')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}