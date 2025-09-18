'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Users,
  Calendar,
  Settings,
  Filter,
  Search,
  Star,
  Archive,
  Copy,
  Trash2,
} from 'lucide-react';
import { Project, Board, List, Card } from '@/types/project';
import { projectsApi } from '@/lib/api';
import KanbanList from './KanbanList';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  project: Project;
  onBack: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
}

interface ActiveDragItem {
  type: 'card' | 'list';
  item: Card | List;
}

const EnhancedKanbanBoard = ({ project, onBack, onProjectUpdate }: KanbanBoardProps) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [activeItem, setActiveItem] = useState<ActiveDragItem | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    assignedTo: '',
    priority: '',
    dueDate: '',
    labels: [] as string[]
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Mock data for now - will be replaced with API calls
  const mockBoards: Board[] = [
    {
      _id: '1',
      title: 'Main Project Board',
      description: 'Primary board for project tasks',
      project: project._id,
      createdBy: project.owner,
      isDefault: true,
      color: '#4F46E5',
      position: 1,
      isArchived: false,
      settings: {
        allowComments: true,
        allowAttachments: true,
        autoArchive: false,
        cardLimit: 0
      },
      metadata: {
        totalLists: 4,
        totalCards: 0,
        completedCards: 0
      },
      completionPercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockLists: List[] = [
    {
      _id: 'todo',
      title: 'To Do',
      description: 'Tasks that need to be started',
      board: '1',
      project: project._id,
      createdBy: project.owner,
      position: 1,
      color: '#6B7280',
      listType: 'todo',
      isArchived: false,
      metadata: {
        cardCount: 0,
        completedCards: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'inprogress',
      title: 'In Progress',
      description: 'Tasks currently being worked on',
      board: '1',
      project: project._id,
      createdBy: project.owner,
      position: 2,
      color: '#F59E0B',
      listType: 'in_progress',
      isArchived: false,
      metadata: {
        cardCount: 0,
        completedCards: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'review',
      title: 'Review',
      description: 'Tasks pending review',
      board: '1',
      project: project._id,
      createdBy: project.owner,
      position: 3,
      color: '#8B5CF6',
      listType: 'review',
      isArchived: false,
      metadata: {
        cardCount: 0,
        completedCards: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      _id: 'done',
      title: 'Done',
      description: 'Completed tasks',
      board: '1',
      project: project._id,
      createdBy: project.owner,
      position: 4,
      color: '#10B981',
      listType: 'done',
      isArchived: false,
      metadata: {
        cardCount: 0,
        completedCards: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Fetch project boards
  const fetchBoards = async () => {
    try {
      setLoading(true);
      // For now, use mock data - later implement API call
      // const response = await projectsApi.getProjectBoards(project._id);
      setBoards(mockBoards);
      setActiveBoard(mockBoards[0]);
      setLists(mockLists);
      setCards({
        'todo': [],
        'inprogress': [],
        'review': [],
        'done': []
      });
    } catch (err) {
      setError('Failed to fetch boards');
      console.error('Error fetching boards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

    // Determine if we're dragging a card or list
    const draggedCard = Object.values(cards)
      .flat()
      .find(card => card._id === active.id);

    if (draggedCard) {
      setActiveItem({ type: 'card', item: draggedCard });
    } else {
      const draggedList = lists.find(list => list._id === active.id);
      if (draggedList) {
        setActiveItem({ type: 'list', item: draggedList });
      }
    }
  }, [cards, lists]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || !activeItem) return;

    if (activeItem.type === 'card') {
      const cardId = active.id as string;
      const overId = over.id as string;

      // Find source list
      const sourceListId = Object.keys(cards).find(listId =>
        cards[listId].some(card => card._id === cardId)
      );

      if (!sourceListId) return;

      // Determine target list
      let targetListId = overId;

      // If dropped on a card, get its list
      const targetCard = Object.values(cards)
        .flat()
        .find(card => card._id === overId);

      if (targetCard) {
        targetListId = Object.keys(cards).find(listId =>
          cards[listId].some(card => card._id === overId)
        ) || sourceListId;
      }

      // If dropped on a list container
      if (lists.some(list => list._id === overId)) {
        targetListId = overId;
      }

      // Move card if different list
      if (sourceListId !== targetListId) {
        // Update local state immediately for better UX
        const card = cards[sourceListId].find(c => c._id === cardId);
        if (card) {
          const newCards = { ...cards };
          newCards[sourceListId] = newCards[sourceListId].filter(c => c._id !== cardId);
          newCards[targetListId] = [card, ...(newCards[targetListId] || [])];
          setCards(newCards);
        }

        // TODO: Implement API call to move card
        try {
          // await projectsApi.moveCard(cardId, { targetListId, position: 0 });
          console.log(`Moving card ${cardId} from ${sourceListId} to ${targetListId}`);
        } catch (err) {
          setError('Failed to move card');
          console.error('Error moving card:', err);
          // Revert local state on error
          fetchBoards();
        }
      }
    }
  }, [activeItem, cards, lists]);

  // Handle board change
  const handleBoardChange = (boardId: string) => {
    const board = boards.find(b => b._id === boardId);
    if (board) {
      setActiveBoard(board);
    }
  };

  // Handle card click
  const handleCardClick = (card: Card) => {
    console.log('Card clicked:', card);
    // TODO: Open card detail modal
  };

  // Add card to list
  const handleAddCard = (listId: string) => {
    console.log('Add card to list:', listId);
    // TODO: Open create card modal
  };

  // Filter cards based on search and filters
  const getFilteredCards = (listCards: Card[]) => {
    return listCards.filter(card => {
      // Search filter
      if (searchTerm && !card.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Priority filter
      if (filters.priority && card.priority !== filters.priority) {
        return false;
      }

      // Assigned to filter
      if (filters.assignedTo && !card.assignedTo.some(user => user._id === filters.assignedTo)) {
        return false;
      }

      return true;
    });
  };

  useEffect(() => {
    fetchBoards();
  }, [project._id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <Plus size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Boards Found</h2>
          <p className="text-gray-600 mb-4">Create your first board to get started</p>
          <button
            onClick={() => console.log('Create board')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: activeBoard.color }}
                />
                <h1 className="text-2xl font-bold text-gray-900">{activeBoard.title}</h1>
                <button className="p-1 text-gray-400 hover:text-yellow-500 transition-colors">
                  <Star size={16} />
                </button>
              </div>

              <div className="flex -space-x-2">
                {project.members.slice(0, 5).map((member) => (
                  <div
                    key={member._id}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                    title={member.user.name}
                  >
                    {member.user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                ))}
                {project.members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    +{project.members.length - 5}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cards..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Filter size={20} />
              </button>

              {/* Board Selector */}
              <select
                value={activeBoard._id}
                onChange={(e) => handleBoardChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {boards.map(board => (
                  <option key={board._id} value={board._id}>{board.title}</option>
                ))}
              </select>

              <button
                onClick={() => console.log('Create new board')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>New Board</span>
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          {activeBoard.description && (
            <p className="mt-2 text-gray-600">{activeBoard.description}</p>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={filters.dueDate}
              onChange={(e) => setFilters({ ...filters, dueDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Due Dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="this_week">Due This Week</option>
            </select>

            <button
              onClick={() => setFilters({ assignedTo: '', priority: '', dueDate: '', labels: [] })}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 overflow-x-auto pb-6">
            <SortableContext items={lists.map(list => list._id)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => (
                <KanbanList
                  key={list._id}
                  list={list}
                  cards={getFilteredCards(cards[list._id] || [])}
                  onAddCard={() => handleAddCard(list._id)}
                  onCardClick={handleCardClick}
                />
              ))}
            </SortableContext>

            {/* Add List Button */}
            <div className="flex-shrink-0">
              <button
                onClick={() => console.log('Add new list')}
                className="w-72 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                <Plus size={20} className="mx-auto mb-2" />
                <span className="block text-sm">Add another list</span>
              </button>
            </div>
          </div>

          <DragOverlay>
            {activeItem && activeItem.type === 'card' ? (
              <KanbanCard card={activeItem.item as Card} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default EnhancedKanbanBoard;