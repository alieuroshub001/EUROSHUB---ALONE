'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Users,
  MoreHorizontal,
  Settings,
  Filter,
  UserPlus,
  Eye,
  Archive
} from 'lucide-react';

interface Board {
  _id: string;
  name: string;
  description?: string;
  project: {
    _id: string;
    name: string;
  };
  backgroundColor: string;
  lists: any[];
  labels: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
  settings: {
    voting: boolean;
    comments: boolean;
    selfJoin: boolean;
    cardCover: boolean;
    cardAging: boolean;
  };
}

interface BoardHeaderProps {
  board: Board;
  onUpdateBoard: (board: Board) => void;
}

export default function BoardHeader({ board, onUpdateBoard }: BoardHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const handleBackToProject = () => {
    router.push(`/projects/${board.project._id}`);
  };

  const handleStarBoard = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/boards/${board._id}/star`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIsStarred(data.data.isStarred);
      } else {
        console.error('Failed to star board');
      }
    } catch (error) {
      console.error('Error starring board:', error);
    }
  };

  return (
    <div className="bg-black bg-opacity-20 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToProject}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-white">{board.name}</h1>
              <button
                onClick={handleStarBoard}
                className={`p-1 rounded transition-colors ${
                  isStarred
                    ? 'text-yellow-400 hover:text-yellow-500'
                    : 'text-white hover:text-yellow-400'
                }`}
              >
                <Star className="w-5 h-5" fill={isStarred ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-white text-opacity-80">
                {board.project.name}
              </span>
              <span className="text-white text-opacity-60">•</span>
              <span className="text-sm text-white text-opacity-80">
                {board.lists.length} lists
              </span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-white bg-opacity-20 text-white'
                : 'text-white hover:bg-white hover:bg-opacity-20'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            Filter
          </button>

          {/* Members Button */}
          <button className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white hover:bg-opacity-20 transition-colors">
            <Users className="w-4 h-4 inline mr-2" />
            Members
          </button>

          {/* Invite Button */}
          <button className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white hover:bg-opacity-20 transition-colors">
            <UserPlus className="w-4 h-4 inline mr-2" />
            Invite
          </button>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg text-white hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Board Actions</h3>
                </div>

                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Board Settings</span>
                </button>

                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Change Visibility</span>
                </button>

                <hr className="my-2" />

                <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                  <Archive className="w-4 h-4" />
                  <span>Archive Board</span>
                </button>

                <div className="px-4 py-2 border-t border-gray-200 mt-2">
                  <div className="text-xs text-gray-500 mb-2">Background</div>
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      '#0079bf', '#d29034', '#519839', '#b04632',
                      '#89609e', '#cd5a91', '#4bbf6b', '#00aecc'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          // TODO: Implement background change
                          setShowMenu(false);
                        }}
                        className="w-8 h-6 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-t border-white border-opacity-20 p-4">
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-white bg-opacity-20 text-white rounded-full text-sm">
              All cards
            </button>
            <button className="px-3 py-1 text-white hover:bg-white hover:bg-opacity-20 rounded-full text-sm transition-colors">
              Overdue
            </button>
            <button className="px-3 py-1 text-white hover:bg-white hover:bg-opacity-20 rounded-full text-sm transition-colors">
              Due soon
            </button>
            <button className="px-3 py-1 text-white hover:bg-white hover:bg-opacity-20 rounded-full text-sm transition-colors">
              No due date
            </button>
          </div>
        </div>
      )}
    </div>
  );
}