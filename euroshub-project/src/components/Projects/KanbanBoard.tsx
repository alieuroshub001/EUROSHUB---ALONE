'use client';

import { useState, useCallback } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCorners, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Users, Calendar } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import CreateBoardModal from './CreateBoardModal';
import CreateTaskModal from './CreateTaskModal';

interface Member {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignees?: Member[];
  dueDate?: string;
  tags?: string[];
  comments: number;
  attachments: number;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

interface Board {
  id: string;
  name: string;
  description?: string;
  color: string;
  members?: Member[];
  columns: Column[];
}

interface BoardData {
  name: string;
  description?: string;
  color: string;
}

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignees: string[];
  dueDate?: string;
  tags: string[];
}

// Mock data
const mockBoards: Board[] = [
  {
    id: '1',
    name: 'Website Redesign Project',
    description: 'Complete overhaul of company website with modern UI/UX',
    color: '#0fb8af',
    members: [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
      { id: '3', name: 'Mike Johnson' }
    ],
    columns: [
      {
        id: 'todo',
        title: 'To Do',
        color: '#6B7280',
        tasks: [
          {
            id: '1',
            title: 'Research competitor websites',
            description: 'Analyze top 5 competitor websites for UX patterns and design trends',
            priority: 'medium',
            assignees: [{ id: '1', name: 'John Doe' }],
            dueDate: '2024-12-25',
            tags: ['research', 'design'],
            comments: 3,
            attachments: 2
          },
          {
            id: '2',
            title: 'Create wireframes for homepage',
            description: 'Design low-fidelity wireframes for the new homepage layout',
            priority: 'high',
            assignees: [{ id: '2', name: 'Jane Smith' }],
            dueDate: '2024-12-20',
            tags: ['design', 'wireframes'],
            comments: 1,
            attachments: 0
          }
        ]
      },
      {
        id: 'inprogress',
        title: 'In Progress',
        color: '#F59E0B',
        tasks: [
          {
            id: '3',
            title: 'Develop navigation component',
            description: 'Build responsive navigation with mobile menu support',
            priority: 'high',
            assignees: [{ id: '3', name: 'Mike Johnson' }],
            dueDate: '2024-12-22',
            tags: ['development', 'frontend'],
            comments: 5,
            attachments: 1
          }
        ]
      },
      {
        id: 'review',
        title: 'Review',
        color: '#8B5CF6',
        tasks: [
          {
            id: '4',
            title: 'Review color scheme',
            description: 'Get approval on the new brand colors and typography',
            priority: 'low',
            assignees: [{ id: '1', name: 'John Doe' }, { id: '2', name: 'Jane Smith' }],
            dueDate: '2024-12-18',
            tags: ['review', 'design'],
            comments: 0,
            attachments: 3
          }
        ]
      },
      {
        id: 'done',
        title: 'Done',
        color: '#10B981',
        tasks: [
          {
            id: '5',
            title: 'Setup project repository',
            description: 'Initialize Git repository and setup development environment',
            priority: 'medium',
            assignees: [{ id: '3', name: 'Mike Johnson' }],
            dueDate: '2024-12-15',
            tags: ['setup', 'development'],
            comments: 2,
            attachments: 0
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Mobile App Development',
    description: 'React Native mobile application for iOS and Android',
    color: '#3B82F6',
    members: [
      { id: '4', name: 'Sarah Wilson' },
      { id: '5', name: 'Tom Brown' }
    ],
    columns: [
      {
        id: 'todo',
        title: 'To Do',
        color: '#6B7280',
        tasks: []
      },
      {
        id: 'inprogress',
        title: 'In Progress',
        color: '#F59E0B',
        tasks: []
      },
      {
        id: 'review',
        title: 'Review',
        color: '#8B5CF6',
        tasks: []
      },
      {
        id: 'done',
        title: 'Done',
        color: '#10B981',
        tasks: []
      }
    ]
  }
];

const mockTeamMembers: Member[] = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
  { id: '3', name: 'Mike Johnson' },
  { id: '4', name: 'Sarah Wilson' },
  { id: '5', name: 'Tom Brown' },
  { id: '6', name: 'Alice Cooper' },
  { id: '7', name: 'Bob Davis' }
];

const KanbanBoard: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>(mockBoards);
  const [activeBoard, setActiveBoard] = useState<Board | null>(mockBoards[0]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreateBoard, setShowCreateBoard] = useState<boolean>(false);
  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (!activeBoard) return;
    const task = activeBoard.columns
      .flatMap(column => column.tasks)
      .find(task => task.id === active.id);
    setActiveTask(task || null);
  }, [activeBoard]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !activeBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = activeBoard.columns.find(col =>
      col.tasks.some(task => task.id === activeId)
    );

    const destColumn = activeBoard.columns.find(col =>
      col.id === overId || col.tasks.some(task => task.id === overId)
    );

    if (!sourceColumn || !destColumn || sourceColumn.id === destColumn.id) return;

    const task = sourceColumn.tasks.find(task => task.id === activeId);
    if (!task) return;

    const newSourceTasks = sourceColumn.tasks.filter(task => task.id !== activeId);
    const newDestTasks = [...destColumn.tasks, task];

    const updatedBoard: Board = {
      ...activeBoard,
      columns: activeBoard.columns.map(col => {
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

    // Update the board in the boards array
    setBoards(prevBoards =>
      prevBoards.map(board =>
        board.id === activeBoard.id ? updatedBoard : board
      )
    );
  }, [activeBoard]);

  const handleCreateBoard = useCallback((boardData: BoardData) => {
    const newBoard: Board = {
      id: Date.now().toString(),
      ...boardData,
      members: [],
      columns: [
        { id: 'todo', title: 'To Do', color: '#6B7280', tasks: [] },
        { id: 'inprogress', title: 'In Progress', color: '#F59E0B', tasks: [] },
        { id: 'review', title: 'Review', color: '#8B5CF6', tasks: [] },
        { id: 'done', title: 'Done', color: '#10B981', tasks: [] }
      ]
    };

    setBoards(prevBoards => [...prevBoards, newBoard]);

    if (!activeBoard) {
      setActiveBoard(newBoard);
    }

    setShowCreateBoard(false);
  }, [activeBoard]);

  const handleCreateTask = useCallback((taskData: TaskData) => {
    if (!activeBoard || !selectedColumn) return;

    const newTask: Task = {
      id: Date.now().toString(),
      ...taskData,
      assignees: taskData.assignees.map(name => {
        const member = mockTeamMembers.find(m => m.name === name);
        return member || { id: Date.now().toString(), name };
      }),
      comments: 0,
      attachments: 0
    };

    const updatedBoard: Board = {
      ...activeBoard,
      columns: activeBoard.columns.map(col => {
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
  }, [activeBoard, selectedColumn]);

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
              {activeBoard.members?.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                  title={member.name}
                >
                  {member.name.split(' ').map(n => n[0]).join('')}
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
              <span>{activeBoard.columns?.flatMap(col => col.tasks || []).length || 0} tasks</span>
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

            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal size={20} />
            </button>
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
            {activeBoard.columns.map((column) => (
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
          columnTitle={activeBoard.columns.find(col => col.id === selectedColumn)?.title}
          teamMembers={mockTeamMembers}
        />
      )}
    </div>
  );
};

export default KanbanBoard;