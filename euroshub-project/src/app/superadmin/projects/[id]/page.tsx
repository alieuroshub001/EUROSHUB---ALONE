'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Grid, Users, Calendar, Settings, MoreHorizontal, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Board {
  _id: string;
  name: string;
  description?: string;
  backgroundColor: string;
  listCount: number;
  isStarred: boolean;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
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
  boards: Board[];
  createdAt: string;
  dueDate?: string;
}

export default function SuperAdminProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id: projectId } = resolvedParams;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    if (user?.role !== 'superadmin') {
      router.push('/');
      return;
    }

    fetchProject();
  }, [isAuthenticated, user, router, projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/projects/${projectId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data.data.project);
      } else if (response.status === 404) {
        router.push('/superadmin/projects');
      } else {
        console.error('Failed to fetch project');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;

    try {
      const response = await fetch('http://localhost:5001/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newBoardName.trim(),
          project: projectId
        })
      });

      if (response.ok) {
        setNewBoardName('');
        setShowCreateBoard(false);
        fetchProject();
      } else {
        console.error('Failed to create board');
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleBoardClick = (boardId: string) => {
    router.push(`/superadmin/projects/${projectId}/boards/${boardId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h2>
          <p className="text-gray-600">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/superadmin/projects')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-red-600" />
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              </div>
              <p className="text-gray-600 mt-1">{project.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/superadmin/projects/${projectId}/settings`)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Project Owner</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                {project.owner.avatar ? (
                  <img src={project.owner.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <span className="text-sm text-gray-600">
                    {project.owner.firstName[0]}{project.owner.lastName[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {project.owner.firstName} {project.owner.lastName}
                </p>
                <p className="text-sm text-gray-600">Project Owner</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Team Members</h3>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-2xl font-bold text-gray-900">{project.members.length}</span>
              <span className="text-gray-600">members</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Boards</h3>
            <div className="flex items-center space-x-2">
              <Grid className="w-5 h-5 text-gray-500" />
              <span className="text-2xl font-bold text-gray-900">{project.boards.length}</span>
              <span className="text-gray-600">boards</span>
            </div>
          </div>
        </div>

        {/* Boards Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Project Boards</h2>
            <button
              onClick={() => setShowCreateBoard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Board
            </button>
          </div>

          {/* Create Board Form */}
          {showCreateBoard && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Enter board name..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Board
                </button>
                <button
                  onClick={() => {
                    setShowCreateBoard(false);
                    setNewBoardName('');
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Boards Grid */}
          {project.boards.length === 0 ? (
            <div className="text-center py-12">
              <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
              <p className="text-gray-600 mb-4">Create your first board to start organizing tasks</p>
              <button
                onClick={() => setShowCreateBoard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Create Board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {project.boards.map((board) => (
                <div
                  key={board._id}
                  onClick={() => handleBoardClick(board._id)}
                  className="relative group cursor-pointer rounded-lg overflow-hidden h-32 shadow-sm hover:shadow-md transition-shadow"
                  style={{ backgroundColor: board.backgroundColor || '#0079bf' }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all" />
                  <div className="relative p-4 h-full flex flex-col justify-between text-white">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{board.name}</h3>
                      {board.description && (
                        <p className="text-sm text-white text-opacity-80 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white text-opacity-80">
                        {board.listCount} lists
                      </span>
                      {board.isStarred && (
                        <div className="w-4 h-4 text-yellow-400">★</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}