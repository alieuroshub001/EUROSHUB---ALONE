'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Calendar,
  User,
  Clock,
  MessageSquare,
  Archive,
  Copy,
  Trash2,
  Edit3,
  Save,
  CheckSquare,
  Plus,
  DollarSign,
  Target,
  FileText,
  Paperclip,
  Send,
  FolderPlus,
  Folder,
  Download,
  ChevronRight,
  Grid3x3,
  List,
  History,
  MessageCircle,
  Smile,
  SmilePlus,
  Lock
} from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Card } from '../lists/ListContainer';
import { Task as ProjectTask, Subtask } from '../../../types/project';
import TaskModal from './TaskModal';
import Portal from '../../shared/Portal';
import { cardsApi } from '../../../services/trelloBoardsApi';
import { folderApi, fileApi } from '../../../services/filesApi';
import { commentsApi } from '../../../services/commentsApi';
import { activityService, Activity } from '../../../lib/activityService';
import { useAuth } from '@/hooks/useAuth';
import { useSocketContext } from '@/contexts/SocketContext';
import FolderTree from './FolderTree';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  role: string;
}

interface ProjectModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCard: (cardId: string, updates: Partial<Card>) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
  boardMembers?: User[];
}

interface Task {
  _id: string;
  title: string;
  completed: boolean;
  assignedTo?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }>;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  description?: string;
  createdAt: Date;
  subtasks?: Array<{
    _id: string;
    title: string;
    completed: boolean;
  }>;
  // NEW: Dependency fields
  dependsOn?: string;
  isLocked?: boolean;
  lockedReason?: string;
  unlockedAt?: Date;
}

interface Comment {
  _id: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    email?: string;
  };
  text: string;
  mentions?: string[];
  reactions?: Array<{
    emoji: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  }>;
  isEdited?: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

interface ProjectFile {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
  mimetype: string;
  folderId: string | null;
  cloudflareKey?: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt: Date;
  createdAt: Date;
  isDeleted: boolean;
}

interface FolderNode {
  _id: string;
  name: string;
  parentFolder: string | null;
  cardId: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  children?: FolderNode[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdateCard,
  onDeleteCard,
  canEdit,
  canDelete,
  boardMembers = [],
}) => {
  const { user } = useAuth();
  const { socket, isConnected, joinCard, leaveCard } = useSocketContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'files' | 'comments' | 'activity'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Card>>(card);
  const [editTitle, setEditTitle] = useState(card.title);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileViewMode, setFileViewMode] = useState<'list' | 'grid'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // NEW: Task dependency state
  const [newTaskDependsOn, setNewTaskDependsOn] = useState<string | null>(null);
  const [newTaskAutoAssign, setNewTaskAutoAssign] = useState(false);
  const [newTaskAssignTo, setNewTaskAssignTo] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Extended project data
  const [projectData, setProjectData] = useState({
    budget: card.budget || 0,
    status: card.status || 'planning',
    priority: card.priority || 'medium',
    startDate: card.startDate ? new Date(card.startDate).toISOString().split('T')[0] : '',
    endDate: card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '',
    progress: card.progress || 0,
    category: card.category || '',
    estimatedHours: card.estimatedHours || 0,
    actualHours: card.actualHours || 0,
  });

  // Note: boardMembers now comes from props

  // Load real data when card changes
  useEffect(() => {
    setEditData(card);
    setIsEditing(false);

    // Update project data when card changes
    setProjectData({
      budget: card.budget || 0,
      status: card.status || 'planning',
      priority: card.priority || 'medium',
      startDate: card.startDate ? new Date(card.startDate).toISOString().split('T')[0] : '',
      endDate: card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '',
      progress: card.progress || 0,
      category: card.category || '',
      estimatedHours: card.estimatedHours || 0,
      actualHours: card.actualHours || 0,
    });

    if (card._id) {
      loadCardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  // Refresh data when modal is opened
  useEffect(() => {
    if (isOpen && card._id) {
      setError(null); // Clear any previous errors
      setTasks([]); // Clear existing tasks to prevent stale data
      loadCardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, card._id]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
        setShowReactionPicker(null);
      }
    };

    if (showEmojiPicker || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker, showReactionPicker]);

  // Socket.IO real-time activity updates and task updates
  useEffect(() => {
    if (!socket || !isConnected || !isOpen || !card._id) return;

    // Join card room for real-time updates
    joinCard(card._id);

    // Listen for activity events
    const handleActivityCreated = (activity: Activity) => {
      console.log('New activity received:', activity);
      setActivities(prev => [activity, ...prev]);
    };

    // Listen for task creation (only update if it's for this card)
    const handleTaskCreated = (data: { cardId: string; task: any }) => {
      if (data.cardId === card._id) {
        console.log('✅ Task created in this card:', data.task);
        setTasks(prev => {
          // Check if task already exists
          if (prev.some(t => t._id === data.task._id)) return prev;
          return [...prev, {
            ...data.task,
            priority: data.task.priority || 'medium'
          }];
        });
      }
    };

    // Listen for task updates (only update if it's for this card)
    const handleTaskUpdated = (data: { cardId: string; taskId: string; task: any }) => {
      if (data.cardId === card._id) {
        console.log('🔄 Task updated in this card:', data.task);
        setTasks(prev => prev.map(task =>
          task._id === data.taskId ? { ...task, ...data.task } : task
        ));
      }
    };

    // Listen for task deletion (only update if it's for this card)
    const handleTaskDeleted = (data: { cardId: string; taskId: string }) => {
      if (data.cardId === card._id) {
        console.log('🗑️ Task deleted from this card:', data.taskId);
        setTasks(prev => prev.filter(task => task._id !== data.taskId));
      }
    };

    socket.on('activity-created', handleActivityCreated);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('activity-created', handleActivityCreated);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      leaveCard(card._id);
    };
  }, [socket, isConnected, isOpen, card._id, joinCard, leaveCard]);

  const loadCardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get detailed card data with tasks and comments from backend
      const cardData = await cardsApi.getCard(card._id) as {
        tasks?: Array<{
          _id: string;
          title: string;
          description?: string;
          completed: boolean;
          assignedTo?: unknown;
          dueDate?: Date;
          priority?: string;
          createdAt?: Date;
          dependsOn?: string;
          isLocked?: boolean;
          lockedReason?: string;
          unlockedAt?: Date;
        }>;
        attachments?: Array<{
          _id: string;
          filename: string;
          originalName?: string;
          url: string;
          size: number;
          mimetype: string;
          cloudflareKey?: string;
          folderId?: string | null;
          uploadedBy: unknown;
          uploadedAt?: Date;
          createdAt?: Date;
          isDeleted?: boolean;
        }>;
      };

      // Set tasks from backend with deduplication and proper population
      if (cardData.tasks && Array.isArray(cardData.tasks)) {
        // Remove duplicates based on _id and ensure proper structure
        const uniqueTasks = cardData.tasks.filter((task, index, array) =>
          array.findIndex((t) => t._id === task._id) === index
        ).map((task) => ({
          _id: task._id,
          title: task.title,
          description: task.description || '',
          completed: Boolean(task.completed),
          assignedTo: task.assignedTo
            ? (Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo])
            : [],
          dueDate: task.dueDate,
          priority: (task.priority || 'medium') as 'low' | 'medium' | 'high',
          createdAt: task.createdAt || new Date(),
          dependsOn: task.dependsOn,
          isLocked: task.isLocked,
          lockedReason: task.lockedReason,
          unlockedAt: task.unlockedAt
        }));

        console.log('LOADED TASKS DEBUG:', {
          cardId: card._id,
          rawTasks: cardData.tasks,
          processedTasks: uniqueTasks
        });

        setTasks(uniqueTasks);
      } else {
        setTasks([]);
      }

      // Load comments from API
      try {
        const commentsData = await commentsApi.getComments(card._id);
        setComments(commentsData || []);
      } catch (error) {
        console.error('Error loading comments:', error);
        setComments([]);
      }

      // Set files from backend
      if (cardData.attachments && Array.isArray(cardData.attachments)) {
        const formattedFiles = cardData.attachments.map((attachment) => ({
          _id: attachment._id,
          filename: attachment.filename,
          originalName: attachment.originalName || attachment.filename,
          url: attachment.url,
          size: attachment.size,
          mimetype: attachment.mimetype,
          type: attachment.mimetype,
          cloudflareKey: attachment.cloudflareKey,
          folderId: attachment.folderId || null,
          uploadedBy: attachment.uploadedBy as { _id: string; firstName: string; lastName: string; },
          uploadedAt: attachment.uploadedAt || attachment.createdAt || new Date(),
          createdAt: attachment.createdAt || new Date(),
          isDeleted: attachment.isDeleted || false
        }));
        setFiles(formattedFiles.filter((f) => !f.isDeleted));
      } else {
        setFiles([]);
      }

      // Load folders
      try {
        const foldersData = await folderApi.getFolders(card._id);
        setFolders(foldersData.folders || []);
      } catch (folderError) {
        console.error('Error loading folders:', folderError);
        setFolders([]);
      }

      // Load activities
      try {
        const activitiesData = await activityService.getCardActivities(card._id);
        setActivities(activitiesData || []);
      } catch (activityError) {
        console.error('Error loading activities:', activityError);
        setActivities([]);
      }

    } catch (error) {
      console.error('Error loading card data:', error);
      setError('Failed to load card data. Please try again.');
      // Set empty arrays on error
      setTasks([]);
      setComments([]);
      setFiles([]);
      setFolders([]);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [card._id]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Combine basic card data with project data
      const updateData = {
        ...editData,
        budget: projectData.budget,
        status: projectData.status,
        priority: projectData.priority,
        startDate: projectData.startDate ? new Date(projectData.startDate) : undefined,
        dueDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
        progress: projectData.progress,
        category: projectData.category,
        estimatedHours: projectData.estimatedHours,
        actualHours: projectData.actualHours,
      };

      await onUpdateCard(card._id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating card:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== card.title) {
      try {
        await onUpdateCard(card._id, { title: editTitle.trim() });
      } catch (error) {
        console.error('Error updating title:', error);
        setEditTitle(card.title); // Revert on error
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(card);
    setEditTitle(card.title);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await onDeleteCard(card._id);
        onClose();
      } catch (error) {
        console.error('Error deleting card:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      // Add comment via API
      const result = await commentsApi.addComment(card._id, {
        text: newComment.trim(),
        mentions: [] // TODO: Extract mentions from comment text
      });

      // Add the new comment to state
      setComments([...comments, result.data]);
      setNewComment('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewComment(prev => prev + emojiData.emoji);
  };

  const handleReactionClick = async (commentId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const comment = comments.find(c => c._id === commentId);
      const existingReaction = comment?.reactions?.find(
        r => {
          // Handle both populated and non-populated user objects
          const userId = typeof r.user === 'string' ? r.user : r.user?._id;
          return userId === user?.id && r.emoji === emoji;
        }
      );

      if (existingReaction) {
        // Remove reaction
        await commentsApi.removeReaction(commentId, emoji, card._id);
      } else {
        // Add reaction
        await commentsApi.addReaction(commentId, { emoji, cardId: card._id });
      }

      // Reload comments to get updated reactions
      const commentsData = await commentsApi.getComments(card._id);
      setComments(commentsData || []);
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    setIsAddingTask(true);
    try {
      const taskData: any = {
        title: newTask.trim(),
        priority: 'medium' as const
      };

      // Add dependency if selected
      if (newTaskDependsOn) {
        taskData.dependsOn = newTaskDependsOn;
      }

      // Add auto-assignment configuration if enabled
      if (newTaskAutoAssign && newTaskAssignTo.length > 0) {
        taskData.autoAssignOnUnlock = true;
        taskData.assignToOnUnlock = newTaskAssignTo;

        // If no dependencies, assign immediately
        if (!newTaskDependsOn) {
          taskData.assignedTo = newTaskAssignTo;
        }
      }

      const newTaskFromAPI = await cardsApi.addTask(card._id, taskData);

      // Resolve assigned user IDs to full user objects
      let resolvedAssignedTo = [];
      if (newTaskFromAPI.assignedTo && Array.isArray(newTaskFromAPI.assignedTo)) {
        resolvedAssignedTo = newTaskFromAPI.assignedTo.map((userId: string) => {
          const member = boardMembers.find(m => m._id === userId);
          return member ? {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            avatar: member.avatar
          } : null;
        }).filter(Boolean);
      } else if (newTaskFromAPI.assignedTo && typeof newTaskFromAPI.assignedTo === 'string') {
        const member = boardMembers.find(m => m._id === newTaskFromAPI.assignedTo);
        if (member) {
          resolvedAssignedTo = [{
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            avatar: member.avatar
          }];
        }
      } else if (newTaskFromAPI.assignedTo && Array.isArray(newTaskFromAPI.assignedTo) && newTaskFromAPI.assignedTo.length > 0 && typeof newTaskFromAPI.assignedTo[0] === 'object') {
        // API already returned full user objects
        resolvedAssignedTo = newTaskFromAPI.assignedTo;
      }

      // Create properly structured task object
      const formattedTask = {
        _id: newTaskFromAPI._id,
        title: newTaskFromAPI.title,
        description: newTaskFromAPI.description || '',
        completed: Boolean(newTaskFromAPI.completed),
        assignedTo: resolvedAssignedTo,
        dueDate: newTaskFromAPI.dueDate,
        priority: newTaskFromAPI.priority || 'medium',
        createdAt: newTaskFromAPI.createdAt || new Date(),
        dependsOn: newTaskFromAPI.dependsOn,
        isLocked: newTaskFromAPI.isLocked,
        lockedReason: newTaskFromAPI.lockedReason,
        unlockedAt: newTaskFromAPI.unlockedAt
      };

      // Add new task to the list, ensuring no duplicates
      setTasks(prevTasks => {
        const existingIds = prevTasks.map(t => t._id);
        if (existingIds.includes(formattedTask._id)) {
          return prevTasks; // Task already exists
        }
        return [...prevTasks, formattedTask];
      });

      setNewTask('');
      setNewTaskDependsOn(null);
      setNewTaskAutoAssign(false);
      setNewTaskAssignTo([]);
      setShowTaskForm(false);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Failed to add task. Please try again.');
    } finally {
      setIsAddingTask(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    const newCompletedState = !task.completed;
    const updatedTask = { ...task, completed: newCompletedState };

    // Optimistically update UI
    setTasks(prevTasks => prevTasks.map(t =>
      t._id === taskId ? updatedTask : t
    ));

    try {
      await cardsApi.updateTask(card._id, taskId, { completed: newCompletedState });
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task. Please try again.');
      // Revert on error
      setTasks(prevTasks => prevTasks.map(t =>
        t._id === taskId ? task : t
      ));
    }
  };


  // Task management functions
  const handleTaskClick = (task: Task) => {
    console.log('TASK CLICK DEBUG:', {
      taskId: task._id,
      cardId: card._id,
      taskTitle: task.title,
      fullTask: task
    });
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    console.log('UPDATE TASK DEBUG:', {
      taskId,
      cardId: card._id,
      updates,
      availableTasks: tasks.map(t => ({ id: t._id, title: t.title }))
    });

    const originalTask = tasks.find(t => t._id === taskId);
    if (!originalTask) {
      console.error('TASK NOT FOUND:', { taskId, availableTaskIds: tasks.map(t => t._id) });
      return;
    }

    // Prepare properly formatted update object
    const formattedUpdates: {
      title?: string;
      description?: string;
      completed?: boolean;
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high';
      dueDate?: Date;
    } = {
      title: updates.title,
      description: updates.description,
      completed: updates.completed,
      priority: updates.priority,
      dueDate: updates.dueDate,
      // Convert assignedTo to a single string (first assigned user ID) for API compatibility
      assignedTo: updates.assignedTo && Array.isArray(updates.assignedTo) && updates.assignedTo.length > 0
        ? (typeof updates.assignedTo[0] === 'string' ? updates.assignedTo[0] : updates.assignedTo[0]._id)
        : undefined
    };

    // Update local state immediately (optimistic update)
    setTasks(prev => prev.map(task =>
      task._id === taskId ? { ...task, ...updates } : task
    ));

    try {
      const response = await cardsApi.updateTask(card._id, taskId, formattedUpdates);

      console.log('TASK UPDATE RESPONSE:', {
        taskId,
        response,
        assignedTo: response?.assignedTo
      });

      // Update with the response data which has populated assignedTo
      if (response) {
        // Resolve assigned user IDs to full user objects (same logic as task creation)
        let resolvedAssignedTo = [];
        if (response.assignedTo && Array.isArray(response.assignedTo)) {
          resolvedAssignedTo = response.assignedTo.map((userId: string) => {
            if (typeof userId === 'object') return userId; // Already a user object
            const member = boardMembers.find(m => m._id === userId);
            return member ? {
              _id: member._id,
              firstName: member.firstName,
              lastName: member.lastName,
              avatar: member.avatar
            } : null;
          }).filter(Boolean);
        } else if (response.assignedTo && typeof response.assignedTo === 'string') {
          const member = boardMembers.find(m => m._id === response.assignedTo);
          if (member) {
            resolvedAssignedTo = [{
              _id: member._id,
              firstName: member.firstName,
              lastName: member.lastName,
              avatar: member.avatar
            }];
          }
        }

        const updatedTaskData = {
          ...response,
          assignedTo: resolvedAssignedTo
        };
        console.log('UPDATING LOCAL STATE WITH:', updatedTaskData);
        setTasks(prev => prev.map(task =>
          task._id === taskId ? { ...task, ...updatedTaskData } : task
        ));
      }

      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task. Please try again.');
      // Revert changes on error
      setTasks(prev => prev.map(task =>
        task._id === taskId ? originalTask : task
      ));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const originalTasks = [...tasks];

    // Optimistically remove task from UI
    setTasks(prev => prev.filter(task => task._id !== taskId));

    try {
      await cardsApi.deleteTask(card._id, taskId);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task. Please try again.');
      // Revert on error
      setTasks(originalTasks);
    }
  };

  // Subtask handlers
  const handleAddSubtask = async (taskId: string, subtaskData: { title: string }) => {
    try {
      const newSubtask = await cardsApi.addSubtask(card._id, taskId, subtaskData);

      // Update the task in the local state to include the new subtask
      setTasks(prev => prev.map(task => {
        if (task._id === taskId) {
          return {
            ...task,
            subtasks: [...(task.subtasks || []), newSubtask]
          };
        }
        return task;
      }));

      // Update the selected task if it's the one being modified
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(prev => prev ? {
          ...prev,
          subtasks: [...(prev.subtasks || []), newSubtask]
        } : prev);
      }

      setError(null);
    } catch (error) {
      console.error('Error adding subtask:', error);
      setError('Failed to add subtask. Please try again.');
      throw error; // Re-throw so TaskModal can handle toast
    }
  };

  const handleUpdateSubtask = async (taskId: string, subtaskId: string, updates: { title?: string; completed?: boolean }) => {
    try {
      const updatedSubtask = await cardsApi.updateSubtask(card._id, taskId, subtaskId, updates);

      // Update the task in the local state
      setTasks(prev => prev.map(task => {
        if (task._id === taskId) {
          return {
            ...task,
            subtasks: (task.subtasks || []).map(subtask =>
              subtask._id === subtaskId ? { ...subtask, ...updatedSubtask } : subtask
            )
          };
        }
        return task;
      }));

      // Update the selected task if it's the one being modified
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(prev => prev ? {
          ...prev,
          subtasks: (prev.subtasks || []).map(subtask =>
            subtask._id === subtaskId ? { ...subtask, ...updatedSubtask } : subtask
          )
        } : prev);
      }

      setError(null);
    } catch (error) {
      console.error('Error updating subtask:', error);
      setError('Failed to update subtask. Please try again.');
      throw error; // Re-throw so TaskModal can handle toast
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    try {
      await cardsApi.deleteSubtask(card._id, taskId, subtaskId);

      // Update the task in the local state
      setTasks(prev => prev.map(task => {
        if (task._id === taskId) {
          return {
            ...task,
            subtasks: (task.subtasks || []).filter(subtask => subtask._id !== subtaskId)
          };
        }
        return task;
      }));

      // Update the selected task if it's the one being modified
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask(prev => prev ? {
          ...prev,
          subtasks: (prev.subtasks || []).filter(subtask => subtask._id !== subtaskId)
        } : prev);
      }

      setError(null);
    } catch (error) {
      console.error('Error deleting subtask:', error);
      setError('Failed to delete subtask. Please try again.');
      throw error; // Re-throw so TaskModal can handle toast
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Clean Project Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {tasks.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {completedTasks}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {progressPercentage.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
        </div>
      </div>

      {/* Clean Progress Bar */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-gray-900 dark:text-white">Project Progress</h3>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <select
                value={projectData.status}
                onChange={(e) => setProjectData(prev => ({ ...prev, status: e.target.value as 'planning' | 'open' | 'in_progress' | 'review' | 'blocked' | 'completed' | 'on_hold' }))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="planning">Planning</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            ) : (
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                projectData.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                projectData.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                projectData.status === 'on_hold' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {projectData.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            )}

            {isEditing ? (
              <select
                value={projectData.priority}
                onChange={(e) => setProjectData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }))}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            ) : (
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                projectData.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                projectData.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                projectData.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}>
                {projectData.priority.charAt(0).toUpperCase() + projectData.priority.slice(1)}
              </span>
            )}
          </div>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
          <span>0%</span>
          <span>{completedTasks} of {tasks.length} tasks</span>
          <span>100%</span>
        </div>
      </div>

      {/* Clean Description */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Description</h3>
        {isEditing ? (
          <textarea
            value={editData.description || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What's this project about?"
            rows={4}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        ) : (
          <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400">
            {card.description ? (
              <p className="leading-relaxed">{card.description}</p>
            ) : (
              <p className="italic text-gray-500 dark:text-gray-500">No description provided yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Project Meta */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Created {formatDate(card.createdAt)}</span>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>By {typeof card.createdBy === 'object' ? `${card.createdBy?.firstName} ${card.createdBy?.lastName}` : card.createdBy || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Card Appearance */}
      {canEdit && isEditing && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Card Appearance</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Color Picker */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Card Color</h4>
              <div className="space-y-3">
                {/* Predefined Colors */}
                <div className="grid grid-cols-6 gap-2">
                  {[
                    '#ffffff', '#f3f4f6', '#ef4444', '#f97316', '#eab308',
                    '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditData(prev => ({ ...prev, color: color === '#ffffff' ? undefined : color }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        (editData.color === color || (!editData.color && color === '#ffffff'))
                          ? 'border-blue-500 scale-110'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color === '#ffffff' ? 'Default (White)' : color}
                    />
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editData.color || '#ffffff'}
                    onChange={(e) => setEditData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Custom color</span>
                  {editData.color && (
                    <button
                      onClick={() => setEditData(prev => ({ ...prev, color: undefined }))}
                      className="text-xs text-red-600 hover:text-red-700 underline"
                    >
                      Remove color
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Cover Image</h4>
              <div className="space-y-3">
                {/* Current Cover Image Preview */}
                {editData.coverImage && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editData.coverImage}
                      alt="Cover preview"
                      className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    />
                    <button
                      onClick={() => setEditData(prev => ({ ...prev, coverImage: '' }))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* File Upload Area */}
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIsLoading(true);
                        try {
                          const uploadResult = await cardsApi.uploadCoverImage(file);
                          setEditData(prev => ({ ...prev, coverImage: uploadResult.url }));
                        } catch (error) {
                          console.error('Error uploading image:', error);
                          alert('Failed to upload image. Please try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    className="hidden"
                    id="cover-image-upload"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="cover-image-upload"
                    className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isLoading
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Paperclip className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Click to upload an image
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Optional URL Input */}
                <div className="relative">
                  <div className="flex items-center">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="px-2 text-xs text-gray-500 dark:text-gray-400">or paste URL</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <input
                    type="url"
                    value={editData.coverImage || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, coverImage: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="mt-2 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dates */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Timeline</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Start:</span>
              {isEditing ? (
                <input
                  type="date"
                  value={projectData.startDate}
                  onChange={(e) => setProjectData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <span className="text-gray-900 dark:text-white">{projectData.startDate || 'Not set'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">End:</span>
              {isEditing ? (
                <input
                  type="date"
                  value={projectData.endDate}
                  onChange={(e) => setProjectData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <span className="text-gray-900 dark:text-white">{projectData.endDate || 'Not set'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Budget</h4>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-gray-400" />
            {isEditing ? (
              <input
                type="number"
                value={projectData.budget}
                onChange={(e) => setProjectData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-32"
                min="0"
                step="0.01"
              />
            ) : (
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                ${projectData.budget.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Additional Project Fields */}
      {isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Category</h4>
            <input
              type="text"
              value={projectData.category}
              onChange={(e) => setProjectData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="e.g., Web Development, Marketing"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Time Tracking */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Time Tracking (hours)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Estimated</label>
                <input
                  type="number"
                  value={projectData.estimatedHours}
                  onChange={(e) => setProjectData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Actual</label>
                <input
                  type="number"
                  value={projectData.actualHours}
                  onChange={(e) => setProjectData(prev => ({ ...prev, actualHours: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Team Members ({card.members.length})</h4>
        <div className="flex flex-wrap gap-2">
          {card.members.map((member) => (
            <div key={member.userId._id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1">
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                {member.userId.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.userId.avatar}
                    alt={`${member.userId.firstName} ${member.userId.lastName}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">
                    {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {member.userId.firstName} {member.userId.lastName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Labels */}
      {card.labels.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Labels</h4>
          <div className="flex flex-wrap gap-2">
            {card.labels.map((label, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTasksTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tasks ({completedTasks}/{tasks.length})
        </h3>
        {canEdit && (
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Add Task Form */}
      {showTaskForm && (
        <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 relative ${isAddingTask ? 'overflow-hidden' : ''}`}>
          {/* Loading overlay */}
          {isAddingTask && (
            <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Creating task...
                </p>
              </div>
            </div>
          )}

          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Enter task title..."
            disabled={isAddingTask}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            onKeyPress={(e) => e.key === 'Enter' && !newTaskDependsOn && !isAddingTask && handleAddTask()}
          />

          {/* Dependency Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Depends on (Optional)
            </label>
            <select
              value={newTaskDependsOn || ''}
              onChange={(e) => setNewTaskDependsOn(e.target.value || null)}
              disabled={isAddingTask}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
            >
              <option value="">No dependency</option>
              {tasks.filter(t => !t.completed).map(task => (
                <option key={task._id} value={task._id}>
                  {task.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Task will be locked until the selected task is completed
            </p>
          </div>

          {/* Auto-assignment on unlock */}
          {newTaskDependsOn && (
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newTaskAutoAssign}
                  onChange={(e) => setNewTaskAutoAssign(e.target.checked)}
                  disabled={isAddingTask}
                  className="rounded border-gray-300 dark:border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-assign when unlocked
                </span>
              </label>

              {newTaskAutoAssign && (
                <div className="pl-6 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assign to
                  </label>
                  <select
                    multiple
                    value={newTaskAssignTo}
                    onChange={(e) => setNewTaskAssignTo(Array.from(e.target.selectedOptions, option => option.value))}
                    disabled={isAddingTask}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    size={Math.min(boardMembers?.length || 3, 5)}
                  >
                    {boardMembers?.map(member => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName} ({member.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Hold Ctrl/Cmd to select multiple users
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              disabled={!newTask.trim() || isAddingTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-all duration-200"
            >
              {isAddingTask ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Task
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowTaskForm(false);
                setNewTask('');
                setNewTaskDependsOn(null);
                setNewTaskAutoAssign(false);
                setNewTaskAssignTo([]);
              }}
              disabled={isAddingTask}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task._id}
            className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
              task.completed
                ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                : task.isLocked
                ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-300 dark:border-orange-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!task.isLocked) toggleTask(task._id);
                }}
                disabled={task.isLocked}
                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  task.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : task.isLocked
                    ? 'bg-gray-200 border-gray-400 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                }`}
              >
                {task.completed && <CheckSquare className="w-3 h-3" />}
                {task.isLocked && <Lock className="w-3 h-3 text-gray-500" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium ${
                    task.completed
                      ? 'text-gray-500 dark:text-gray-400 line-through'
                      : task.isLocked
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {task.title}
                  </h4>
                  {task.isLocked && (
                    <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                      Locked
                    </span>
                  )}
                </div>

                {task.isLocked && task.lockedReason && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    🔒 {task.lockedReason}
                  </p>
                )}

                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <div className="flex -space-x-2">
                        {task.assignedTo.slice(0, 3).map((assigned, index) => {
                          if (!assigned || typeof assigned === 'string') return null;
                          return (
                            <div
                              key={assigned._id || index}
                              className="w-5 h-5 rounded-full border border-white dark:border-gray-800 overflow-hidden"
                              title={`${assigned.firstName} ${assigned.lastName}`}
                            >
                              {assigned.avatar && assigned.avatar.trim() ? (
                                <Image
                                  src={assigned.avatar}
                                  alt={`${assigned.firstName} ${assigned.lastName}`}
                                  width={20}
                                  height={20}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-medium">
                                  {assigned.firstName?.charAt(0)}{assigned.lastName?.charAt(0)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {task.assignedTo.length > 3 && (
                          <div className="w-5 h-5 rounded-full border border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[8px] font-medium">
                            +{task.assignedTo.length - 3}
                          </div>
                        )}
                      </div>
                      <span>
                        {task.assignedTo.filter(a => a && typeof a !== 'string').map(a => `${a.firstName} ${a.lastName}`).join(', ')}
                      </span>
                    </span>
                  )}

                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}

                  <span className={`px-2 py-1 rounded ${
                    task.priority === 'high' ? 'bg-red-100 text-red-600' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No tasks created yet</p>
          </div>
        )}
      </div>
    </div>
  );


  // Folder and file handlers
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsLoading(true);
    try {
      await folderApi.createFolder(card._id, {
        name: newFolderName.trim(),
        parentFolderId: currentFolderId
      });

      // Reload folders
      const foldersData = await folderApi.getFolders(card._id);
      setFolders(foldersData.folders || []);

      setNewFolderName('');
      setShowCreateFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderRename = async (folderId: string, newName: string) => {
    setIsLoading(true);
    try {
      await folderApi.renameFolder(folderId, newName);

      // Reload folders
      const foldersData = await folderApi.getFolders(card._id);
      setFolders(foldersData.folders || []);
    } catch (error) {
      console.error('Error renaming folder:', error);
      setError('Failed to rename folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderDelete = async (folderId: string) => {
    setIsLoading(true);
    try {
      await folderApi.deleteFolder(folderId);

      // Reload folders and files
      const foldersData = await folderApi.getFolders(card._id);
      setFolders(foldersData.folders || []);
      await loadCardData();

      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      setError('Failed to delete folder');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    try {
      await fileApi.uploadFiles(card._id, selectedFiles, currentFolderId);

      // Reload card data to get updated files
      await loadCardData();
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDownload = async (fileId: string) => {
    setIsLoading(true);
    try {
      const file = files.find(f => f._id === fileId);
      if (file) {
        await fileApi.downloadFile(fileId, card._id, file.originalName || file.filename);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    setIsLoading(true);
    try {
      await fileApi.deleteFile(fileId, card._id);

      // Reload files
      await loadCardData();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFilesTab = () => {
    // Check if current user can upload files based on their role or creator status
    const currentUserMember = card.members.find(m => m.userId._id === user?.id);
    const currentUserRole = currentUserMember?.role || 'viewer';
    const isCreator = canEdit; // Board/project creator has edit access
    const canUploadFiles = isCreator || ['project-manager', 'lead', 'contributor'].includes(currentUserRole);

    // Get current folder files
    const currentFolderFiles = files.filter(f =>
      !f.isDeleted && (
        currentFolderId === null
          ? !f.folderId
          : f.folderId === currentFolderId
      )
    );

    return (
      <div className="grid grid-cols-12 gap-4 h-full relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Processing...
              </p>
            </div>
          </div>
        )}

        {/* Folder tree sidebar */}
        <div className="col-span-3 border-r border-gray-200 dark:border-gray-700 pr-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Folders
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Click to navigate)
              </span>
            </h4>
            {canEdit && canUploadFiles && (
              <button
                onClick={() => setShowCreateFolderModal(true)}
                disabled={isLoading}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Create folder"
              >
                <FolderPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          <FolderTree
            folders={folders}
            currentFolderId={currentFolderId}
            onFolderClick={setCurrentFolderId}
            onFolderRename={handleFolderRename}
            onFolderDelete={handleFolderDelete}
            canEdit={canEdit && canUploadFiles}
          />
        </div>

        {/* Files content */}
        <div className="col-span-9">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Files ({currentFolderFiles.length})
              </h3>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setFileViewMode('list')}
                    className={`p-1.5 rounded transition-all ${
                      fileViewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFileViewMode('grid')}
                    className={`p-1.5 rounded transition-all ${
                      fileViewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                    title="Grid view"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                </div>

                {canEdit && canUploadFiles && (
                  <label className={`flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm cursor-pointer transition-all ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    <Paperclip className="w-4 h-4" />
                    {isLoading ? 'Uploading...' : 'Upload Files'}
                    <input
                      type="file"
                      multiple
                      disabled={isLoading}
                      className="hidden"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        handleFileUpload(selectedFiles);
                        e.target.value = ''; // Reset input
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Files list/grid */}
            <div className={fileViewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
              {currentFolderFiles.map((file) => {
                const canDeleteFile = isCreator || ['project-manager', 'lead'].includes(currentUserRole) ||
                                     file.uploadedBy._id === user?.id;

                // Grid View
                if (fileViewMode === 'grid') {
                  return (
                    <div
                      key={file._id}
                      className="group flex flex-col p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                      onClick={() => handleFileDownload(file._id)}
                    >
                      {/* File icon */}
                      <div className="w-full aspect-square bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex items-center justify-center mb-3">
                        <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm mb-1" title={file.originalName || file.filename}>
                          {file.originalName || file.filename}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {file.uploadedBy.firstName} {file.uploadedBy.lastName}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleFileDownload(file._id)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>

                        {canDeleteFile && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this file?')) {
                                handleFileDelete(file._id);
                              }
                            }}
                            disabled={isLoading}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // List View
                return (
                  <div
                    key={file._id}
                    className="group flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                    onClick={() => handleFileDownload(file._id)}
                  >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {file.originalName || file.filename}
                        </h4>
                        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>by {file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                        <span>•</span>
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Click to download
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleFileDownload(file._id)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>

                      {canDeleteFile && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this file?')) {
                              handleFileDelete(file._id);
                            }
                          }}
                          disabled={isLoading}
                          className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {currentFolderFiles.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No files in this folder</p>
                  {canUploadFiles && (
                    <p className="text-sm mt-1">Upload files to get started</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create folder modal */}
        {showCreateFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Folder
              </h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 disabled:opacity-50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) handleCreateFolder();
                  if (e.key === 'Escape') {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg"
                >
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCommentsTab = () => {
    // Check if current user can comment based on their role or creator status
    const currentUserMember = card.members.find(m => m.userId._id === user?.id);
    const isCreator = canEdit; // Board/project creator has edit access
    const currentUserRole = isCreator ? 'owner' : (currentUserMember?.role || 'viewer');
    const canComment = isCreator || ['project-manager', 'lead', 'contributor', 'commenter'].includes(currentUserRole);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h3>

        {/* Add Comment */}
        {canComment ? (
          <form onSubmit={handleAddComment} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 dark:text-gray-300">
                    {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Commenting as <span className="font-medium">{currentUserRole}</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="Add emoji"
                      >
                        <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>
                      {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
                          <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400">⚠</div>
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Commenting Restricted</p>
                <p>You need at least Commenter access to add comments to this project.</p>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => {
            const commentUserMember = card.members.find(m => m.userId._id === comment.author._id);
            // Check if comment author is the card creator (owner)
            const createdById = typeof card.createdBy === 'string' ? card.createdBy : card.createdBy?._id;
            const isCommentAuthorOwner = createdById === comment.author._id;
            const commentUserRole = isCommentAuthorOwner ? 'owner' : (commentUserMember?.role || 'viewer');
            const canDeleteComment = isCreator || ['project-manager', 'lead'].includes(currentUserRole) ||
                                   comment.author._id === user?.id;

            return (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {comment.author.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.author.avatar}
                      alt={`${comment.author.firstName} ${comment.author.lastName}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300">
                      {comment.author.firstName.charAt(0)}{comment.author.lastName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.author.firstName} {comment.author.lastName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${{
                          'owner': 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900',
                          'project-manager': 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900',
                          'lead': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
                          'contributor': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900',
                          'commenter': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900',
                          'viewer': 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
                        }[commentUserRole] || 'text-gray-600 bg-gray-100'}`}>
                          {commentUserRole}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>

                      {canDeleteComment && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this comment?')) {
                              setComments(prev => prev.filter(c => c._id !== comment._id));
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {comment.text}
                    </p>

                    {/* Reactions */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {/* Display existing reactions grouped by emoji */}
                      {comment.reactions && comment.reactions.length > 0 && (
                        <>
                          {Object.entries(
                            comment.reactions.reduce((acc, reaction) => {
                              if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
                              acc[reaction.emoji].push(reaction.user);
                              return acc;
                            }, {} as Record<string, typeof comment.reactions[0]['user'][]>)
                          ).map(([emoji, users]) => {
                            const userReacted = users.some(u => {
                              const userId = typeof u === 'string' ? u : u?._id;
                              return userId === user?.id;
                            });
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReactionClick(comment._id, emoji)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors ${
                                  userReacted
                                    ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700'
                                    : 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                                title={users.map(u => {
                                  if (typeof u === 'string') return 'User';
                                  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User';
                                }).join(', ')}
                              >
                                <span>{emoji}</span>
                                <span className="text-xs text-gray-600 dark:text-gray-300">{users.length}</span>
                              </button>
                            );
                          })}
                        </>
                      )}

                      {/* Add reaction button */}
                      <div className="relative">
                        <button
                          onClick={() => setShowReactionPicker(showReactionPicker === comment._id ? null : comment._id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Add reaction"
                        >
                          <SmilePlus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>

                        {showReactionPicker === comment._id && (
                          <div className="absolute bottom-full left-0 mb-2 z-50">
                            <EmojiPicker
                              onEmojiClick={(emojiData) => {
                                handleReactionClick(comment._id, emojiData.emoji);
                              }}
                              reactionsDefaultOpen={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {comments.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet</p>
              {canComment ? (
                <p className="text-sm mt-1">Start the conversation by adding a comment</p>
              ) : (
                <p className="text-sm mt-1">Comments will appear here when added by team members</p>
              )}
            </div>
          )}
        </div>

        {/* Activity Permission Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Comment Permissions</h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div><strong>Board/Project Creator:</strong> Full access - can comment and delete any comment</div>
            <div><strong>Project Manager & Team Lead:</strong> Can comment and delete any comment</div>
            <div><strong>Contributor & Commenter:</strong> Can comment and delete own comments</div>
            <div><strong>Viewer:</strong> Can only read comments</div>
          </div>
        </div>
      </div>
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'card_created':
        return Plus;
      case 'card_updated':
      case 'card_description_changed':
        return Edit3;
      case 'card_comment_added':
        return MessageCircle;
      case 'card_attachment_added':
      case 'card_image_added':
      case 'card_file_uploaded':
        return Paperclip;
      case 'card_task_added':
        return CheckSquare;
      case 'card_task_completed':
      case 'card_completed':
      case 'card_checklist_item_completed':
        return CheckSquare;
      case 'card_member_added':
        return User;
      case 'card_moved':
        return Archive;
      case 'card_deleted':
      case 'card_file_deleted':
      case 'card_attachment_deleted':
        return Trash2;
      case 'card_folder_created':
        return Folder;
      default:
        return Clock;
    }
  };

  const renderActivityTab = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity Log ({activities.length})
          </h3>
          <button
            onClick={() => loadCardData()}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <History className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Activity Timeline */}
        <div className="relative">
          {/* Timeline line */}
          {activities.length > 0 && (
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          )}

          {/* Activity items */}
          <div className="space-y-4">
            {activities.map((activity) => {
              const ActivityIcon = getActivityIcon(activity.type);
              const userName = `${activity.user.firstName} ${activity.user.lastName}`;
              const activityMessage = activityService.formatActivityMessage(activity);
              const timeAgo = activityService.formatTimeAgo(activity.createdAt);

              return (
                <div key={activity._id} className="relative flex gap-4 pl-12">
                  {/* Icon */}
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-white dark:border-gray-900">
                    <ActivityIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {activity.user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={activity.user.avatar}
                              alt={userName}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                              {activity.user.firstName.charAt(0)}{activity.user.lastName.charAt(0)}
                            </div>
                          )}
                          <p className="text-sm text-gray-900 dark:text-white">
                            {activityMessage}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {timeAgo}
                        </p>

                        {/* Show additional details if available */}
                        {activity.metadata?.changes && activity.metadata.changes.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {activity.metadata.changes.slice(0, 3).map((change, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="font-medium">{change.field}:</span>
                                <span className="line-through text-red-600 dark:text-red-400">
                                  {String(change.oldValue || 'none').substring(0, 50)}
                                </span>
                                <span>→</span>
                                <span className="text-green-600 dark:text-green-400">
                                  {String(change.newValue || 'none').substring(0, 50)}
                                </span>
                              </div>
                            ))}
                            {activity.metadata.changes.length > 3 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                +{activity.metadata.changes.length - 3} more changes
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {activities.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm mt-1">All card activities will appear here</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && activities.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Loading activities...</p>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">ℹ</div>
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">Activity Timeline</p>
              <p className="text-blue-700 dark:text-blue-300">
                This tab shows a chronological log of all actions performed on this card, including:
              </p>
              <ul className="list-disc list-inside mt-2 text-blue-700 dark:text-blue-300 space-y-1">
                <li>Card creation and updates</li>
                <li>Task additions and completions</li>
                <li>File uploads and deletions</li>
                <li>Comments and reactions</li>
                <li>Member assignments</li>
                <li>Description changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Portal>
      {/* Backdrop with prominent blur effect */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
        style={{ zIndex: 9999 }}
        onClick={onClose}
      >
        {/* Modal Container - Clean & Prominent */}
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 w-full max-w-7xl h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Minimalistic Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200/70 dark:border-gray-700/70 bg-gray-50/30 dark:bg-gray-800/30">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="mx-4 h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-semibold bg-transparent text-gray-900 dark:text-white border-none outline-none focus:ring-0 p-0"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {card.title}
                  </h1>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveTitle}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200"
                        disabled={isLoading}
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(card.title);
                        }}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      disabled={isLoading}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                disabled={isLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-8 mb-4 p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Minimalistic Tab Navigation */}
          <div className="px-8 mb-6">
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {[
                { id: 'overview', label: 'Overview', icon: Target },
                { id: 'tasks', label: 'Tasks', icon: CheckSquare },
                { id: 'files', label: 'Files', icon: FileText },
                { id: 'comments', label: 'Comments', icon: MessageCircle },
                { id: 'activity', label: 'Activity', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'tasks' | 'files' | 'comments' | 'activity')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-8 pb-8 overflow-y-auto flex-1">
            <div className="max-w-full">
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'tasks' && renderTasksTab()}
              {activeTab === 'files' && renderFilesTab()}
              {activeTab === 'comments' && renderCommentsTab()}
              {activeTab === 'activity' && renderActivityTab()}
            </div>
          </div>

          {/* Clean Footer with Actions */}
          <div className="px-8 py-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200">
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200">
                      <Archive className="w-4 h-4" />
                      Archive
                    </button>
                  </>
                )}
              </div>

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask as ProjectTask | null}
        cardId={card._id}
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        onUpdateTask={handleUpdateTask as (taskId: string, updates: Partial<ProjectTask>) => void}
        onDeleteTask={handleDeleteTask as (taskId: string) => void}
        onAddSubtask={handleAddSubtask}
        onUpdateSubtask={handleUpdateSubtask}
        onDeleteSubtask={handleDeleteSubtask}
        projectMembers={boardMembers.map(member => ({
          userId: {
            _id: member._id,
            firstName: member.firstName,
            lastName: member.lastName,
            avatar: member.avatar,
            email: member.email || '',
            role: (member.role as 'superadmin' | 'admin' | 'hr' | 'employee' | 'client') || 'employee'
          },
          role: member.role
        }))}
        canEdit={canEdit}
      />
    </Portal>
  );
};

export default ProjectModal;