'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  Image,
  Clock,
  MessageSquare,
  Archive,
  Copy,
  Trash2,
  Edit3,
  Save,
  UserPlus,
  CheckSquare,
  Plus,
  DollarSign,
  Target,
  AlertCircle,
  Users,
  FileText,
  Activity,
  Settings,
  Star,
  Paperclip,
  Send
} from 'lucide-react';
import { Card } from '../lists/ListContainer';
import TaskModal from './TaskModal';
import Portal from '../../shared/Portal';
import { cardsApi } from '../../../services/trelloBoardsApi';
import { useAuth } from '@/hooks/useAuth';

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
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  description?: string;
  createdAt: Date;
}

interface Comment {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  content: string;
  createdAt: Date;
}

interface ProjectFile {
  _id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  uploadedAt: Date;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'files' | 'activity'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Card>>(card);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [card]);

  // Refresh data when modal is opened
  useEffect(() => {
    if (isOpen && card._id) {
      setError(null); // Clear any previous errors
      setTasks([]); // Clear existing tasks to prevent stale data
      loadCardData();
    }
  }, [isOpen, card._id]);

  const loadCardData = async () => {
    setIsLoading(true);
    try {
      // Get detailed card data with tasks and comments from backend
      const cardData = await cardsApi.getCard(card._id) as any;

      // Set tasks from backend with deduplication and proper population
      if (cardData.tasks && Array.isArray(cardData.tasks)) {
        // Remove duplicates based on _id and ensure proper structure
        const uniqueTasks = cardData.tasks.filter((task: any, index: number, array: any[]) =>
          array.findIndex((t: any) => t._id === task._id) === index
        ).map((task: any) => ({
          _id: task._id,
          title: task.title,
          description: task.description || '',
          completed: Boolean(task.completed),
          assignedTo: task.assignedTo,
          dueDate: task.dueDate,
          priority: task.priority || 'medium',
          createdAt: task.createdAt || new Date()
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

      // Set comments from backend
      if (cardData.comments && Array.isArray(cardData.comments)) {
        setComments(cardData.comments);
      } else {
        setComments([]);
      }

      // Set files from backend
      if (cardData.attachments && Array.isArray(cardData.attachments)) {
        const formattedFiles = cardData.attachments.map((attachment: any) => ({
          _id: attachment._id,
          filename: attachment.filename,
          url: attachment.url,
          size: attachment.size,
          type: attachment.mimetype,
          uploadedBy: attachment.uploadedBy,
          uploadedAt: attachment.uploadedAt || attachment.createdAt
        }));
        setFiles(formattedFiles);
      } else {
        setFiles([]);
      }

    } catch (error) {
      console.error('Error loading card data:', error);
      setError('Failed to load card data. Please try again.');
      // Set empty arrays on error
      setTasks([]);
      setComments([]);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleCancel = () => {
    setEditData(card);
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
      // For now, add the comment locally
      // TODO: Implement comments API endpoint on backend
      const comment: Comment = {
        _id: `comment_${Date.now()}`,
        userId: { _id: '1', firstName: 'Current', lastName: 'User' },
        content: newComment.trim(),
        createdAt: new Date()
      };

      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    setIsLoading(true);
    try {
      const taskData = {
        title: newTask.trim(),
        priority: 'medium' as const
      };

      const newTaskFromAPI = await cardsApi.addTask(card._id, taskData);

      // Create properly structured task object
      const formattedTask = {
        _id: newTaskFromAPI._id,
        title: newTaskFromAPI.title,
        description: newTaskFromAPI.description || '',
        completed: Boolean(newTaskFromAPI.completed),
        assignedTo: newTaskFromAPI.assignedTo,
        dueDate: newTaskFromAPI.dueDate,
        priority: newTaskFromAPI.priority || 'medium',
        createdAt: newTaskFromAPI.createdAt || new Date()
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
      setShowTaskForm(false);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Failed to add task. Please try again.');
    } finally {
      setIsLoading(false);
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
    const formattedUpdates = {
      ...updates,
      assignedTo: updates.assignedTo && typeof updates.assignedTo === 'object'
        ? (updates.assignedTo as any)._id
        : updates.assignedTo
    };

    // Update local state immediately (optimistic update)
    setTasks(prev => prev.map(task =>
      task._id === taskId ? { ...task, ...updates } : task
    ));

    try {
      await cardsApi.updateTask(card._id, taskId, formattedUpdates);
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
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
              className="text-2xl font-bold w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{card.title}</h1>
          )}

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Created {formatDate(card.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {progressPercentage.toFixed(0)}% Complete
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <select
              value={projectData.status}
              onChange={(e) => setProjectData(prev => ({ ...prev, status: e.target.value as any }))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              projectData.status === 'completed' ? 'bg-green-100 text-green-600' :
              projectData.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
              projectData.status === 'on_hold' ? 'bg-yellow-100 text-yellow-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {projectData.status.charAt(0).toUpperCase() + projectData.status.slice(1)}
            </span>
          )}

          {isEditing ? (
            <select
              value={projectData.priority}
              onChange={(e) => setProjectData(prev => ({ ...prev, priority: e.target.value as any }))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              projectData.priority === 'high' ? 'bg-red-100 text-red-600' :
              projectData.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
              'bg-green-100 text-green-600'
            }`}>
              {projectData.priority.charAt(0).toUpperCase() + projectData.priority.slice(1)}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{completedTasks}/{tasks.length} tasks completed</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
        {isEditing ? (
          <textarea
            value={editData.description || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Add a detailed project description..."
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
        ) : (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {card.description || 'No description provided.'}
          </p>
        )}
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
                          <Image className="w-6 h-6 text-gray-400 mb-1" />
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
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Enter task title..."
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Add Task
            </button>
            <button
              onClick={() => setShowTaskForm(false)}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
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
            className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
              task.completed ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
            }`}
            onClick={() => handleTaskClick(task)}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTask(task._id);
                }}
                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  task.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                }`}
              >
                {task.completed && <CheckSquare className="w-3 h-3" />}
              </button>

              <div className="flex-1">
                <h4 className={`font-medium ${
                  task.completed
                    ? 'text-gray-500 dark:text-gray-400 line-through'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {task.title}
                </h4>

                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {task.assignedTo && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
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


  const renderFilesTab = () => {
    // Check if current user can upload files based on their role or creator status
    const currentUserMember = card.members.find(m => m.userId._id === user?.id);
    const currentUserRole = currentUserMember?.role || 'viewer';
    const isCreator = canEdit; // Board/project creator has edit access
    const canUploadFiles = isCreator || ['project-manager', 'lead', 'contributor'].includes(currentUserRole);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Files ({files.length})
          </h3>
          {canEdit && canUploadFiles && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm cursor-pointer">
                <Paperclip className="w-4 h-4" />
                Upload File
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const selectedFiles = Array.from(e.target.files || []);
                    if (selectedFiles.length === 0) return;

                    setIsLoading(true);
                    try {
                      // TODO: Implement file upload API
                      console.log('Files to upload:', selectedFiles);
                      // Simulate upload for now
                      setTimeout(() => {
                        setIsLoading(false);
                        // Add uploaded files to state (mock)
                        const mockFiles = selectedFiles.map((file, index) => ({
                          _id: `file_${Date.now()}_${index}`,
                          filename: file.name,
                          url: URL.createObjectURL(file),
                          size: file.size,
                          type: file.type,
                          uploadedBy: {
                            _id: user?.id || '1',
                            firstName: user?.firstName || 'Current',
                            lastName: user?.lastName || 'User'
                          },
                          uploadedAt: new Date()
                        }));
                        setFiles(prev => [...prev, ...mockFiles]);
                      }, 1000);
                    } catch (error) {
                      console.error('Error uploading files:', error);
                      setIsLoading(false);
                    }
                  }}
                />
              </label>
            </div>
          )}
          {canEdit && !canUploadFiles && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              File upload requires Contributor access or higher
            </div>
          )}
        </div>

        {/* File Upload Permission Info */}
        {canEdit && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5">ℹ</div>
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">File Upload Permissions</p>
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Board/Project Creator:</strong> Full access - can upload and delete any file<br/>
                  <strong>Project Manager & Team Lead:</strong> Can upload any file type<br/>
                  <strong>Contributor:</strong> Can upload documents, images, and project files<br/>
                  <strong>Commenter & Viewer:</strong> Can only download and view files
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {files.map((file) => {
            const canDeleteFile = isCreator || ['project-manager', 'lead'].includes(currentUserRole) ||
                                 file.uploadedBy._id === user?.id;

            return (
              <div key={file._id} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">{file.filename}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>by {file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                      {file.type || 'Unknown type'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Create download link
                      const link = document.createElement('a');
                      link.href = file.url;
                      link.download = file.filename;
                      link.click();
                    }}
                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    Download
                  </button>

                  {canDeleteFile && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this file?')) {
                          setFiles(prev => prev.filter(f => f._id !== file._id));
                        }
                      }}
                      className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {files.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No files uploaded yet</p>
              {canUploadFiles ? (
                <p className="text-sm mt-1">Upload files to share with your team</p>
              ) : (
                <p className="text-sm mt-1">Contact a project manager to upload files</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActivityTab = () => {
    // Check if current user can comment based on their role or creator status
    const currentUserMember = card.members.find(m => m.userId._id === user?.id);
    const currentUserRole = currentUserMember?.role || 'viewer';
    const isCreator = canEdit; // Board/project creator has edit access
    const canComment = isCreator || ['project-manager', 'lead', 'contributor', 'commenter'].includes(currentUserRole);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Activity & Comments ({comments.length})
        </h3>

        {/* Add Comment */}
        {canComment ? (
          <form onSubmit={handleAddComment} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {user?.avatar ? (
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Commenting as <span className="font-medium">{currentUserRole}</span>
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
            const commentUserMember = card.members.find(m => m.userId._id === comment.userId._id);
            const commentUserRole = commentUserMember?.role || 'viewer';
            const canDeleteComment = isCreator || ['project-manager', 'lead'].includes(currentUserRole) ||
                                   comment.userId._id === user?.id;

            return (
              <div key={comment._id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {comment.userId.avatar ? (
                    <img
                      src={comment.userId.avatar}
                      alt={`${comment.userId.firstName} ${comment.userId.lastName}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300">
                      {comment.userId.firstName.charAt(0)}{comment.userId.lastName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.userId.firstName} {comment.userId.lastName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${{
                          'project-manager': 'text-purple-600 bg-purple-100',
                          'lead': 'text-blue-600 bg-blue-100',
                          'contributor': 'text-green-600 bg-green-100',
                          'commenter': 'text-yellow-600 bg-yellow-100',
                          'viewer': 'text-gray-600 bg-gray-100'
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
                      {comment.content}
                    </p>
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

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Project Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your project information, tasks, and team
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={isLoading}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-red-600 dark:text-red-400">⚠</div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare },
              { id: 'files', label: 'Files', icon: FileText },
              { id: 'activity', label: 'Activity', icon: MessageSquare },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'tasks' && renderTasksTab()}
          {activeTab === 'files' && renderFilesTab()}
          {activeTab === 'activity' && renderActivityTab()}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                Delete Project
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        projectMembers={editData.members || []}
        canEdit={canEdit}
      />
      </div>
    </Portal>
  );
};

export default ProjectModal;