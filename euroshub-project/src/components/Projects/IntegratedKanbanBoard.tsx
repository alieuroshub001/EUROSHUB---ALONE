'use client';

import { useState, useCallback, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCorners, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Users, Calendar, Settings, Archive, Copy } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import CreateBoardModal from './CreateBoardModal';
import CreateTaskModal from './CreateTaskModal';
import EnhancedEditTaskModal from './EnhancedEditTaskModal';
import { cardService } from '@/lib/cardService';
import { boardService, Board, List, Card, CreateBoardRequest, CreateCardRequest } from '../../lib/boardService';
import { projectService, Project } from '../../lib/projectService';
import { userService } from '../../lib/userService';
import { notificationService } from '../../lib/notificationService';

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
  assignees: card.assignedTo.filter(user => user).map(user =>
    `${user!.firstName || ''} ${user!.lastName || ''}`.trim() || 'Unknown User'
  ),
  dueDate: card.dueDate,
  tags: card.labels.map(label => label.name),
  comments: card.comments.length,
  attachments: card.attachments.length,
  commentsData: card.comments.map(comment => ({
    id: comment._id,
    author: {
      id: comment.author?._id || '',
      name: comment.author ? `${comment.author.firstName || ''} ${comment.author.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User',
      avatar: comment.author?.avatar
    },
    content: comment.text,
    createdAt: comment.createdAt
  })),
  attachmentsData: card.attachments.map((attachment, index) => {
    console.log('Attachment from backend:', attachment); // Debug log
    return {
      id: (attachment as any)._id || (attachment as any).id || `attachment-${index}-${Date.now()}`, // Generate fallback ID
      name: attachment.originalName,
      size: attachment.size,
      type: attachment.mimetype,
      url: attachment.url,
      uploadedBy: {
        id: attachment.uploadedBy,
        name: 'Unknown User' // We'll need to get this from somewhere else
      },
      uploadedAt: card.createdAt // Using card creation date as fallback
    };
  }),
  subtasks: card.subtasks?.map(subtask => ({
    id: subtask._id || subtask.id,
    title: subtask.title,
    completed: subtask.completed,
    createdAt: subtask.createdAt,
    completedAt: subtask.completedAt
  })) || [],
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

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate?: string;
  tags: string[];
  subtasks?: Subtask[];
}

interface BoardData {
  name: string;
  description?: string;
  color: string;
  selectedMembers?: string[];
}

// Helper function to safely get member name
const getMemberName = (member: any): string => {
  if (typeof member.name === 'string') {
    return member.name;
  }
  if (member.name && typeof member.name.name === 'string') {
    return member.name.name;
  }
  return 'Unknown User';
};

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
  const [showEditTask, setShowEditTask] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
          id: member.user!._id,
          name: `${member.user!.firstName || ''} ${member.user!.lastName || ''}`.trim() || 'Unknown User',
          avatar: member.user!.avatar,
          role: member.role
        }));
        setTeamMembers(members);

        // Load current user info
        try {
          const { authAPI } = await import('@/lib/auth');
          const userInfo = await authAPI.getMe();
          if (userInfo) {
            setCurrentUser({
              id: userInfo.id,
              name: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Unknown User',
              avatar: userInfo.avatar
            });
          }
        } catch (userErr) {
          console.warn('Failed to load current user:', userErr);
        }

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
        console.log('Loading boards for project:', project._id);
        const boardsData = await boardService.getProjectBoards(project._id);
        console.log('Raw boards data from API:', boardsData);

        const convertedBoards = boardsData.map(convertBackendBoard);
        console.log('Converted boards:', convertedBoards);

        // Keep board members as they are stored in the backend
        // Don't automatically assign all project members to all boards
        const boardsWithMembers = convertedBoards;

        console.log('Boards with members:', boardsWithMembers);
        setBoards(boardsWithMembers);

        if (boardsWithMembers.length > 0 && !activeBoard) {
          console.log('Setting active board:', boardsWithMembers[0]);
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
    console.log('handleCreateBoard called with:', boardData);

    if (!project) {
      console.error('No project found');
      return;
    }

    console.log('Project found:', project._id);

    try {
      const createData: CreateBoardRequest = {
        title: boardData.name,
        description: boardData.description,
        color: boardData.color,
        createDefaultLists: true
      };

      console.log('Creating board with data:', createData);
      const newBoardData = await boardService.createBoard(project._id, createData);
      console.log('Board created successfully:', newBoardData);

      // Get selected members or use empty array for selective assignment
      const selectedMembers = boardData.selectedMembers
        ? teamMembers.filter(member => boardData.selectedMembers?.includes(member.user?._id || member._id))
        : [];

      const newBoard = {
        ...convertBackendBoard(newBoardData),
        members: selectedMembers
      };

      console.log('Converted board:', newBoard);
      setBoards(prevBoards => [...prevBoards, newBoard]);

      if (!activeBoard) {
        setActiveBoard(newBoard);
      }

      setShowCreateBoard(false);
      console.log('Create board modal closed');
    } catch (err) {
      console.error('Failed to create board:', err);
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
          console.log('Create task - Looking for member with name:', name);
          const member = teamMembers.find(m => {
            const memberName = getMemberName(m);
            console.log('Create task - Checking member:', memberName, 'against:', name);
            return memberName === name;
          });
          console.log('Create task - Found member:', member);
          return member?.id;
        }).filter(Boolean),
        dueDate: taskData.dueDate || undefined,
        labels: taskData.tags.map(tag => ({ name: tag, color: '#6B7280' }))
      };

      console.log('Create task data being sent:', createData);

      const newCardData = await boardService.createCard(selectedColumn, createData);
      const newTask = convertBackendCard(newCardData);

      // Send notifications to assigned users for new task
      if (project && currentUser && taskData.assignees.length > 0) {
        const assignedUserIds = taskData.assignees.map(name => {
          const member = teamMembers.find(m => {
            const memberName = getMemberName(m);
            return memberName === name;
          });
          return member?.id;
        }).filter(Boolean);

        if (assignedUserIds.length > 0) {
          // Send notification asynchronously (don't block UI)
          notificationService.notifyTaskAssignment(
            assignedUserIds,
            newCardData._id,
            taskData.title,
            project._id,
            project.title,
            currentUser._id || currentUser.id
          ).catch(err => {
            console.error('Failed to send task creation assignment notifications:', err);
          });
        }
      }

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
  }, [activeBoard, selectedColumn, teamMembers, project, currentUser]);

  const handleEditTask = useCallback((taskId: string, taskData?: TaskData) => {
    // Find the task to edit
    let taskToEdit = null;
    for (const column of activeBoard?.columns || []) {
      const foundTask = column.tasks.find((t: any) => t.id === taskId);
      if (foundTask) {
        taskToEdit = foundTask;
        break;
      }
    }

    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setShowEditTask(true);
    }
  }, [activeBoard]);

  const handleUpdateTask = useCallback(async (taskId: string, taskData: TaskData) => {
    if (!activeBoard) return;

    try {
      console.log('handleUpdateTask called with:', { taskId, taskData, teamMembers });

      // Find current task assignees for comparison
      let currentAssignees: string[] = [];
      for (const col of activeBoard.columns) {
        const task = col.tasks.find((t: any) => t.id === taskId);
        if (task) {
          currentAssignees = task.assignees || [];
          break;
        }
      }

      const updateData: any = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        assignedTo: taskData.assignees.map(name => {
          console.log('Looking for member with name:', name);
          const member = teamMembers.find(m => {
            const memberName = getMemberName(m);
            console.log('Checking member:', memberName, 'against:', name);
            return memberName === name;
          });
          console.log('Found member:', member);
          return member?.id;
        }).filter(Boolean),
        dueDate: taskData.dueDate || undefined,
        labels: taskData.tags.map(tag => ({ name: tag, color: '#6B7280' }))
      };

      console.log('Update data being sent:', updateData);

      const updatedCardData = await boardService.updateCard(taskId, updateData);
      const updatedTask = convertBackendCard(updatedCardData);

      // Check for newly assigned users and send notifications
      if (project && currentUser && taskData.title) {
        const newAssignees = taskData.assignees.filter(name => !currentAssignees.includes(name));

        if (newAssignees.length > 0) {
          const newlyAssignedUserIds = newAssignees.map(name => {
            const member = teamMembers.find(m => {
              const memberName = getMemberName(m);
              return memberName === name;
            });
            return member?.id;
          }).filter(Boolean);

          if (newlyAssignedUserIds.length > 0) {
            // Send notification asynchronously (don't block UI)
            notificationService.notifyTaskAssignment(
              newlyAssignedUserIds,
              taskId,
              taskData.title,
              project._id,
              project.title,
              currentUser._id || currentUser.id
            ).catch(err => {
              console.error('Failed to send task assignment notifications:', err);
            });
          }
        }
      }

      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => ({
          ...col,
          tasks: col.tasks.map((task: any) =>
            task.id === taskId ? updatedTask : task
          )
        }))
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [activeBoard, teamMembers, project, currentUser]);

  const handleAddComment = useCallback(async (taskId: string, comment: string) => {
    try {
      await cardService.addComment(taskId, comment);

      // Refresh the task data to get updated comments
      const updatedCard = await cardService.getCard(taskId);

      // Update the task in the current board
      const updatedTask = convertBackendCard(updatedCard);
      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => ({
          ...col,
          tasks: col.tasks.map((task: any) =>
            task.id === taskId ? { ...task, comments: updatedTask.comments, attachments: updatedTask.attachments, commentsData: updatedTask.commentsData, attachmentsData: updatedTask.attachmentsData } : task
          )
        }))
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );

      // Update editingTask if it matches the updated task
      if (editingTask && editingTask.id === taskId) {
        const updatedEditingTask = updatedBoard.columns
          .flatMap((col: any) => col.tasks)
          .find((task: any) => task.id === taskId);
        if (updatedEditingTask) {
          setEditingTask(updatedEditingTask);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      throw err;
    }
  }, [activeBoard, editingTask]);

  const handleUploadFile = useCallback(async (taskId: string, file: File) => {
    try {
      await cardService.uploadFile(taskId, file);

      // Refresh the task data to get updated attachments
      const updatedCard = await cardService.getCard(taskId);

      // Update the task in the current board
      const updatedTask = convertBackendCard(updatedCard);
      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => ({
          ...col,
          tasks: col.tasks.map((task: any) =>
            task.id === taskId ? { ...task, comments: updatedTask.comments, attachments: updatedTask.attachments, commentsData: updatedTask.commentsData, attachmentsData: updatedTask.attachmentsData } : task
          )
        }))
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );

      // Update editingTask if it matches the updated task
      if (editingTask && editingTask.id === taskId) {
        const updatedEditingTask = updatedBoard.columns
          .flatMap((col: any) => col.tasks)
          .find((task: any) => task.id === taskId);
        if (updatedEditingTask) {
          setEditingTask(updatedEditingTask);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    }
  }, [activeBoard, editingTask]);

  const handleDeleteAttachment = useCallback(async (taskId: string, attachmentId: string) => {
    try {
      await cardService.deleteAttachment(taskId, attachmentId);

      // Refresh the task data to get updated attachments
      const updatedCard = await cardService.getCard(taskId);

      // Update the task in the current board
      const updatedTask = convertBackendCard(updatedCard);
      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => ({
          ...col,
          tasks: col.tasks.map((task: any) =>
            task.id === taskId ? { ...task, comments: updatedTask.comments, attachments: updatedTask.attachments, commentsData: updatedTask.commentsData, attachmentsData: updatedTask.attachmentsData } : task
          )
        }))
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );

      // Update editingTask if it matches the updated task
      if (editingTask && editingTask.id === taskId) {
        const updatedEditingTask = updatedBoard.columns
          .flatMap((col: any) => col.tasks)
          .find((task: any) => task.id === taskId);
        if (updatedEditingTask) {
          setEditingTask(updatedEditingTask);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment');
      throw err;
    }
  }, [activeBoard, editingTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!activeBoard) return;

    try {
      await boardService.deleteCard(taskId);

      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => ({
          ...col,
          tasks: col.tasks.filter((task: any) => task.id !== taskId)
        }))
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, [activeBoard]);

  const handleAssignUser = useCallback(async (taskId: string, userIds: string[]) => {
    try {
      // Find the task to get its title and current assignees
      let taskTitle = '';
      let currentAssignees: string[] = [];

      for (const col of activeBoard.columns) {
        const task = col.tasks.find((t: any) => t.id === taskId);
        if (task) {
          taskTitle = task.title;
          currentAssignees = task.assignees || [];
          break;
        }
      }

      const updatedAssignees = await boardService.assignUsers(taskId, userIds);

      // Send email notifications to newly assigned users
      if (project && currentUser && taskTitle) {
        // Get user IDs of newly assigned users (exclude already assigned ones)
        const newlyAssignedUserIds = updatedAssignees
          .filter(user => user && !currentAssignees.includes(`${user.firstName || ''} ${user.lastName || ''}`.trim()))
          .map(user => user!._id)
          .filter(Boolean);

        if (newlyAssignedUserIds.length > 0) {
          // Send notification asynchronously (don't block UI)
          notificationService.notifyTaskAssignment(
            newlyAssignedUserIds,
            taskId,
            taskTitle,
            project._id,
            project.title,
            currentUser._id || currentUser.id
          ).catch(err => {
            console.error('Failed to send task assignment notifications:', err);
          });
        }
      }

      const updatedBoard = {
        ...activeBoard,
        columns: activeBoard.columns.map((col: any) => ({
          ...col,
          tasks: col.tasks.map((task: any) =>
            task.id === taskId
              ? { ...task, assignees: updatedAssignees.map(user =>
                  `${user!.firstName || ''} ${user!.lastName || ''}`.trim() || 'Unknown User'
                )}
              : task
          )
        }))
      };

      setActiveBoard(updatedBoard);
      setBoards(prevBoards =>
        prevBoards.map(board =>
          board.id === activeBoard.id ? updatedBoard : board
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign users');
    }
  }, [activeBoard, project, currentUser]);

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

      // Keep original members when duplicating board
      const newBoard = {
        ...convertBackendBoard(duplicatedBoard),
        members: activeBoard.members || []
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
      <div>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <Plus size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Boards Found</h2>
            <p className="text-gray-600 mb-4">Create your first project board to get started</p>
            <button
              onClick={() => {
                console.log('Create Board button clicked');
                setShowCreateBoard(true);
                console.log('showCreateBoard set to true');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Board
            </button>
          </div>
        </div>

        {/* Modals - Must be included in this return block */}
        {showCreateBoard && (
          <CreateBoardModal
            onClose={() => {
              console.log('CreateBoardModal onClose called');
              setShowCreateBoard(false);
            }}
            onSubmit={handleCreateBoard}
            projectMembers={teamMembers}
          />
        )}
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
              {activeBoard.members?.slice(0, 5).map((member: any) => {
                const memberName = getMemberName(member);
                return (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                    title={memberName}
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={memberName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      memberName.charAt(0).toUpperCase()
                    )}
                  </div>
                );
              })}
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
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onAssignUser={handleAssignUser}
                onClickTask={handleEditTask}
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
      {console.log('Rendering modals, showCreateBoard:', showCreateBoard)}
      {showCreateBoard && (
        <CreateBoardModal
          onClose={() => {
            console.log('CreateBoardModal onClose called');
            setShowCreateBoard(false);
          }}
          onSubmit={handleCreateBoard}
          projectMembers={teamMembers}
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

      {showEditTask && editingTask && currentUser && (
        <EnhancedEditTaskModal
          task={editingTask}
          onClose={() => {
            setShowEditTask(false);
            setEditingTask(null);
          }}
          onSubmit={handleUpdateTask}
          onAddComment={handleAddComment}
          onUploadFile={handleUploadFile}
          onDeleteAttachment={handleDeleteAttachment}
          teamMembers={teamMembers}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default IntegratedKanbanBoard;