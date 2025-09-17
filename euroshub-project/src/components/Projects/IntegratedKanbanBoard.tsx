'use client';

import { useState, useCallback, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCorners, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Users, Calendar, Settings, Archive, Copy } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import CreateBoardModal from './CreateBoardModal';
import CreateTaskModal from './CreateTaskModal';
import { boardService, Board, List, Card, CreateBoardRequest, CreateCardRequest } from '../../lib/boardService';
import { projectService, Project } from '../../lib/projectService';
import { userService } from '../../lib/userService';

interface IntegratedKanbanBoardProps {
  projectId: string;
  userRole?: string;
}

// Convert backend data to frontend format
const convertBackendCard = (card: Card): any => ({
  id: card._id,
  title: card.title,
  description: card.description,
  priority: card.priority,
  assignees: card.assignedTo.map(user => ({
    id: user._id,
    name: `${user.firstName} ${user.lastName}`,
    avatar: user.avatar
  })),
  dueDate: card.dueDate,
  tags: card.labels.map(label => label.name),
  comments: card.comments.length,
  attachments: card.attachments.length,
  status: card.status,
  isOverdue: card.isOverdue,
  checklistCompletion: card.checklistCompletion
});

const convertBackendList = (list: List): any => ({
  id: list._id,
  title: list.title,
  color: list.color,
  tasks: list.cards?.map(convertBackendCard) || [],
  listType: list.listType,
  cardCount: list.metadata.cardCount,
  wipLimit: list.settings.wipLimit
});

const convertBackendBoard = (board: Board): any => ({
  id: board._id,
  name: board.title,
  description: board.description,
  color: board.color,
  members: [], // Will be populated from project members
  columns: board.lists?.map(convertBackendList) || []
});

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate?: string;
  tags: string[];
}

interface BoardData {
  name: string;
  description?: string;
  color: string;
}

const IntegratedKanbanBoard: React.FC<IntegratedKanbanBoardProps> = ({ projectId, userRole }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any | null>(null);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [showCreateBoard, setShowCreateBoard] = useState<boolean>(false);
  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

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

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await projectService.getProject(projectId);
        setProject(projectData);

        // Set team members from project members
        const members = projectData.members.map(member => ({
          id: member.user._id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          avatar: member.user.avatar,
          role: member.role
        }));
        setTeamMembers(members);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Load boards when project is loaded
  useEffect(() => {
    const loadBoards = async () => {
      if (!project) return;

      try {
        const boardsData = await boardService.getProjectBoards(project._id);
        const convertedBoards = boardsData.map(convertBackendBoard);

        // Add members to each board from project
        const boardsWithMembers = convertedBoards.map(board => ({
          ...board,
          members: teamMembers
        }));

        setBoards(boardsWithMembers);

        if (boardsWithMembers.length > 0 && !activeBoard) {
          setActiveBoard(boardsWithMembers[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load boards');
      }
    };

    if (project) {
      loadBoards();
    }
  }, [project, teamMembers]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (!activeBoard) return;

    const task = activeBoard.columns
      .flatMap((column: any) => column.tasks)
      .find((task: any) => task.id === active.id);
    setActiveTask(task || null);
  }, [activeBoard]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !activeBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = activeBoard.columns.find((col: any) =>
      col.tasks.some((task: any) => task.id === activeId)
    );

    const destColumn = activeBoard.columns.find((col: any) =>
      col.id === overId || col.tasks.some((task: any) => task.id === overId)
    );

    if (!sourceColumn || !destColumn || sourceColumn.id === destColumn.id) return;

    const task = sourceColumn.tasks.find((task: any) => task.id === activeId);
    if (!task) return;

    try {
      // Update backend
      await boardService.moveCard(activeId, destColumn.id);

      // Update local state
      const newSourceTasks = sourceColumn.tasks.filter((task: any) => task.id !== activeId);
      const newDestTasks = [...destColumn.tasks, task];

      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => {
          if (col.id === sourceColumn.id) {
            return { ...col, tasks: newSourceTasks };
          }
          if (col.id === destColumn.id) {
            return { ...col, tasks: newDestTasks };
          }
          return col;
        })
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move card');
    }
  }, [activeBoard]);

  const handleCreateBoard = useCallback(async (boardData: BoardData) => {
    if (!project) return;

    try {
      const createData: CreateBoardRequest = {
        title: boardData.name,
        description: boardData.description,
        color: boardData.color,
        createDefaultLists: true
      };

      const newBoardData = await boardService.createBoard(project._id, createData);
      const newBoard = {
        ...convertBackendBoard(newBoardData),
        members: teamMembers
      };

      setBoards(prevBoards => [...prevBoards, newBoard]);

      if (!activeBoard) {
        setActiveBoard(newBoard);
      }

      setShowCreateBoard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    }
  }, [project, teamMembers, activeBoard]);

  const handleCreateTask = useCallback(async (taskData: TaskData) => {
    if (!activeBoard || !selectedColumn) return;

    try {
      const createData: CreateCardRequest = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        assignedTo: taskData.assignees.map(name => {
          const member = teamMembers.find(m => m.name === name);
          return member?.id;
        }).filter(Boolean),
        dueDate: taskData.dueDate,
        labels: taskData.tags.map(tag => ({ name: tag, color: '#6B7280' }))
      };

      const newCardData = await boardService.createCard(selectedColumn, createData);
      const newTask = convertBackendCard(newCardData);

      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => {
          if (col.id === selectedColumn) {
            return { ...col, tasks: [...col.tasks, newTask] };
          }
          return col;
        })
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );
      setShowCreateTask(false);
      setSelectedColumn(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }, [activeBoard, selectedColumn, teamMembers]);

  const handleAddTask = useCallback((columnId: string) => {
    setSelectedColumn(columnId);
    setShowCreateTask(true);
  }, []);

  const handleBoardChange = useCallback((boardId: string) => {
    const selectedBoard = boards.find(b => b.id === boardId);
    if (selectedBoard) {
      setActiveBoard(selectedBoard);
    }
  }, [boards]);

  const handleDuplicateBoard = useCallback(async () => {
    if (!activeBoard) return;

    try {
      const duplicatedBoard = await boardService.duplicateBoard(
        activeBoard.id,
        `${activeBoard.name} (Copy)`,
        false
      );

      const newBoard = {
        ...convertBackendBoard(duplicatedBoard),
        members: teamMembers
      };

      setBoards(prevBoards => [...prevBoards, newBoard]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate board');
    }
  }, [activeBoard, teamMembers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Project</h2>
          <p className="text-gray-600">Please wait while we load your project boards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <div className="text-red-600 text-2xl">⚠</div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
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
          <p className="text-gray-600 mb-4">Create your first project board to get started</p>
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
    <div>
      {/* Board Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: activeBoard.color }}
              />
              <h2 className="text-xl font-bold text-gray-900">{activeBoard.name}</h2>
            </div>
            <div className="flex -space-x-2">
              {activeBoard.members?.slice(0, 5).map((member: any) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                  title={member.name}
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    member.name.split(' ').map((n: string) => n[0]).join('')
                  )}
                </div>
              ))}
              {activeBoard.members && activeBoard.members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                  +{activeBoard.members.length - 5}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users size={16} />
              <span>{activeBoard.members?.length || 0} members</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar size={16} />
              <span>{activeBoard.columns?.flatMap((col: any) => col.tasks || []).length || 0} tasks</span>
            </div>

            <select
              value={activeBoard.id}
              onChange={(e) => handleBoardChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowCreateBoard(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span>New Board</span>
            </button>

            <div className="relative">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal size={20} />
              </button>
              {/* TODO: Add dropdown menu with board options */}
            </div>
          </div>
        </div>

        {activeBoard.description && (
          <p className="mt-2 text-gray-600">{activeBoard.description}</p>
        )}
      </div>

      {/* Kanban Board */}
      <div className="p-6 bg-gray-50 rounded-b-lg">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-6 overflow-x-auto pb-6">
            {activeBoard.columns.map((column: any) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddTask={handleAddTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard task={activeTask} isDragging />
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

      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onSubmit={handleCreateTask}
          columnTitle={activeBoard.columns.find((col: any) => col.id === selectedColumn)?.title}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
};

export default IntegratedKanbanBoard;