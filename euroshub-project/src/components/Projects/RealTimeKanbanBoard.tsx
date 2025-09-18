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
  Wifi,
  WifiOff,
  Eye,
} from 'lucide-react';
import { Project, Board, List, Card } from '@/types/project';
import { projectsApi } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import KanbanList from './KanbanList';
import KanbanCard from './KanbanCard';
import CreateBoardModal from './CreateBoardModal';
import CreateListModal from './CreateListModal';
import CreateCardModal from './CreateCardModal';
import CardDetailModal from './CardDetailModal';

interface KanbanBoardProps {
  project: Project;
  onBack: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => void;
}

interface ActiveDragItem {
  type: 'card' | 'list';
  item: Card | List;
}

const RealTimeKanbanBoard = ({ project, onBack, onProjectUpdate }: KanbanBoardProps) => {
  const { socket, isConnected, onlineUsers, joinProject, leaveProject, joinBoard, leaveBoard } = useSocketContext();

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Record<string, Card[]>>({});
  const [activeItem, setActiveItem] = useState<ActiveDragItem | null>(null);

  // Modal states
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [onlineProjectMembers, setOnlineProjectMembers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

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

  // Join/leave project room on mount/unmount
  useEffect(() => {
    if (isConnected && project._id) {
      joinProject(project._id);

      return () => {
        leaveProject(project._id);
      };
    }
  }, [isConnected, project._id, joinProject, leaveProject]);

  // Join/leave board room when active board changes
  useEffect(() => {
    if (isConnected && activeBoard) {
      joinBoard(activeBoard._id);

      return () => {
        leaveBoard(activeBoard._id);
      };
    }
  }, [isConnected, activeBoard, joinBoard, leaveBoard]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Board events
    const handleBoardCreated = (data: any) => {
      if (data.projectId === project._id) {
        setBoards(prev => [...prev, data.board]);
      }
    };

    const handleBoardUpdated = (data: any) => {
      if (data.projectId === project._id) {
        setBoards(prev => prev.map(board =>
          board._id === data.boardId ? { ...board, ...data.updates } : board
        ));

        if (activeBoard && activeBoard._id === data.boardId) {
          setActiveBoard(prev => prev ? { ...prev, ...data.updates } : null);
        }
      }
    };

    const handleBoardDeleted = (data: any) => {
      if (data.projectId === project._id) {
        setBoards(prev => prev.filter(board => board._id !== data.boardId));
        if (activeBoard && activeBoard._id === data.boardId) {
          setActiveBoard(boards.length > 1 ? boards[0] : null);
        }
      }
    };

    // List events
    const handleListCreated = (data: any) => {
      if (data.projectId === project._id && activeBoard && data.boardId === activeBoard._id) {
        setLists(prev => [...prev, data.list]);
        setCards(prev => ({ ...prev, [data.list._id]: [] }));
      }
    };

    const handleListUpdated = (data: any) => {
      if (data.projectId === project._id && activeBoard && data.boardId === activeBoard._id) {
        setLists(prev => prev.map(list =>
          list._id === data.listId ? { ...list, ...data.updates } : list
        ));
      }
    };

    // Card events
    const handleCardCreated = (data: any) => {
      if (data.projectId === project._id && activeBoard && data.boardId === activeBoard._id) {
        setCards(prev => ({
          ...prev,
          [data.listId]: [...(prev[data.listId] || []), data.card]
        }));
      }
    };

    const handleCardUpdated = (data: any) => {
      if (data.projectId === project._id && activeBoard && data.boardId === activeBoard._id) {
        setCards(prev => ({
          ...prev,
          [data.listId]: prev[data.listId]?.map(card =>
            card._id === data.cardId ? { ...card, ...data.updates } : card
          ) || []
        }));
      }
    };

    const handleCardMoved = (data: any) => {
      if (data.projectId === project._id && activeBoard && data.boardId === activeBoard._id) {
        setCards(prev => {
          const sourceCards = prev[data.sourceListId] || [];
          const targetCards = prev[data.targetListId] || [];
          const movedCard = sourceCards.find(card => card._id === data.cardId);

          if (!movedCard) return prev;

          const newCards = { ...prev };
          newCards[data.sourceListId] = sourceCards.filter(card => card._id !== data.cardId);
          newCards[data.targetListId] = [...targetCards, { ...movedCard, position: data.position }];

          return newCards;
        });
      }
    };

    const handleCardDeleted = (data: any) => {
      if (data.projectId === project._id && activeBoard && data.boardId === activeBoard._id) {
        setCards(prev => ({
          ...prev,
          [data.listId]: prev[data.listId]?.filter(card => card._id !== data.cardId) || []
        }));
      }
    };

    // Comment events
    const handleCommentAdded = (data: any) => {
      if (data.projectId === project._id && selectedCard && data.cardId === selectedCard._id) {
        setSelectedCard(prev => prev ? {
          ...prev,
          comments: [...prev.comments, data.comment]
        } : null);
      }
    };

    // User presence events
    const handleUserJoinedProject = (data: any) => {
      if (data.projectId === project._id) {
        setOnlineProjectMembers(prev => [...new Set([...prev, data.userId])]);
      }
    };

    const handleUserLeftProject = (data: any) => {
      if (data.projectId === project._id) {
        setOnlineProjectMembers(prev => prev.filter(id => id !== data.userId));
      }
    };

    const handleUserTyping = (data: any) => {
      if (data.cardId) {
        setTypingUsers(prev => ({
          ...prev,
          [data.cardId]: [...new Set([...(prev[data.cardId] || []), data.userName])]
        }));

        // Clear typing after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [data.cardId]: prev[data.cardId]?.filter(name => name !== data.userName) || []
          }));
        }, 3000);
      }
    };

    // Register event listeners
    socket.on('board_created', handleBoardCreated);
    socket.on('board_updated', handleBoardUpdated);
    socket.on('board_deleted', handleBoardDeleted);
    socket.on('list_created', handleListCreated);
    socket.on('list_updated', handleListUpdated);
    socket.on('card_created', handleCardCreated);
    socket.on('card_updated', handleCardUpdated);
    socket.on('card_moved', handleCardMoved);
    socket.on('card_deleted', handleCardDeleted);
    socket.on('comment_added', handleCommentAdded);
    socket.on('user_joined_project', handleUserJoinedProject);
    socket.on('user_left_project', handleUserLeftProject);
    socket.on('user_typing', handleUserTyping);

    return () => {
      // Clean up event listeners
      socket.off('board_created', handleBoardCreated);
      socket.off('board_updated', handleBoardUpdated);
      socket.off('board_deleted', handleBoardDeleted);
      socket.off('list_created', handleListCreated);
      socket.off('list_updated', handleListUpdated);
      socket.off('card_created', handleCardCreated);
      socket.off('card_updated', handleCardUpdated);
      socket.off('card_moved', handleCardMoved);
      socket.off('card_deleted', handleCardDeleted);
      socket.off('comment_added', handleCommentAdded);
      socket.off('user_joined_project', handleUserJoinedProject);
      socket.off('user_left_project', handleUserLeftProject);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, isConnected, project._id, activeBoard, selectedCard]);

  // Update online project members based on global online users
  useEffect(() => {
    const projectMemberIds = project.members.map(member => member.user._id);
    const onlineInProject = onlineUsers.filter(userId => projectMemberIds.includes(userId));
    setOnlineProjectMembers(onlineInProject);
  }, [onlineUsers, project.members]);

  // Mock data for initial load - in real implementation, this would come from API
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

  // Create board with real-time broadcast
  const handleCreateBoard = async (boardData: any) => {
    try {
      // TODO: Implement actual API call
      const newBoard = {
        _id: Date.now().toString(),
        ...boardData,
        project: project._id,
        createdBy: project.owner,
        isDefault: false,
        position: boards.length + 1,
        isArchived: false,
        settings: {
          allowComments: true,
          allowAttachments: true,
          autoArchive: false,
          cardLimit: 0
        },
        metadata: {
          totalLists: 0,
          totalCards: 0,
          completedCards: 0
        },
        completionPercentage: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setBoards([...boards, newBoard]);
      setActiveBoard(newBoard);
      setShowCreateBoard(false);

      // Broadcast to other users
      if (socket && isConnected) {
        socket.emit('board_created', {
          projectId: project._id,
          board: newBoard
        });
      }
    } catch (err) {
      setError('Failed to create board');
      console.error('Error creating board:', err);
    }
  };

  // Handle drag end with real-time updates
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

          // Broadcast move to other users
          if (socket && isConnected && activeBoard) {
            socket.emit('card_moved', {
              projectId: project._id,
              boardId: activeBoard._id,
              cardId,
              sourceListId,
              targetListId,
              position: 0
            });
          }
        }
      }
    }
  }, [activeItem, cards, lists, socket, isConnected, activeBoard, project._id]);

  // Other handlers (same as before but with real-time broadcasting)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

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

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setShowCardDetail(true);
  };

  const handleAddCard = (listId: string) => {
    setSelectedListId(listId);
    setShowCreateCard(true);
  };

  const getFilteredCards = (listCards: Card[]) => {
    return listCards.filter(card => {
      if (searchTerm && !card.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.priority && card.priority !== filters.priority) {
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
            onClick={() => setShowCreateBoard(true)}
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

                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Wifi size={14} />
                      <span className="text-xs">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <WifiOff size={14} />
                      <span className="text-xs">Offline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Online Members */}
              <div className="flex -space-x-2">
                {project.members.slice(0, 5).map((member) => {
                  const isOnline = onlineProjectMembers.includes(member.user._id);
                  return (
                    <div
                      key={member._id}
                      className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white relative ${
                        isOnline ? 'bg-gradient-to-r from-blue-400 to-purple-500' : 'bg-gray-400'
                      }`}
                      title={`${member.user.name} ${isOnline ? '(Online)' : '(Offline)'}`}
                    >
                      {member.user.name.split(' ').map(n => n[0]).join('')}
                      {isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                  );
                })}
                {project.members.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    +{project.members.length - 5}
                  </div>
                )}
              </div>

              {/* Online Users Count */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Eye size={16} />
                <span>{onlineProjectMembers.length} online</span>
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
                onChange={(e) => {
                  const board = boards.find(b => b._id === e.target.value);
                  if (board) setActiveBoard(board);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {boards.map(board => (
                  <option key={board._id} value={board._id}>{board.title}</option>
                ))}
              </select>

              <button
                onClick={() => setShowCreateBoard(true)}
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
                onClick={() => setShowCreateList(true)}
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

      {/* Modals */}
      {showCreateBoard && (
        <CreateBoardModal
          onClose={() => setShowCreateBoard(false)}
          onSubmit={handleCreateBoard}
        />
      )}

      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onSubmit={(listData) => {
            console.log('Create list:', listData);
            setShowCreateList(false);
          }}
          boardTitle={activeBoard.title}
        />
      )}

      {showCreateCard && selectedListId && (
        <CreateCardModal
          onClose={() => {
            setShowCreateCard(false);
            setSelectedListId(null);
          }}
          onSubmit={(cardData) => {
            console.log('Create card:', cardData);
            setShowCreateCard(false);
            setSelectedListId(null);
          }}
          listTitle={lists.find(l => l._id === selectedListId)?.title || ''}
          projectMembers={project.members}
        />
      )}

      {showCardDetail && selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => {
            setShowCardDetail(false);
            setSelectedCard(null);
          }}
          onUpdate={(updatedCard) => {
            const listId = Object.keys(cards).find(listId =>
              cards[listId].some(card => card._id === updatedCard._id)
            );

            if (listId) {
              setCards({
                ...cards,
                [listId]: cards[listId].map(card =>
                  card._id === updatedCard._id ? updatedCard : card
                )
              });
            }

            setSelectedCard(updatedCard);
          }}
          projectMembers={project.members}
        />
      )}
    </div>
  );
};

export default RealTimeKanbanBoard;