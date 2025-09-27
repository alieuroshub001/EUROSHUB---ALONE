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
import MemberAssignmentModal from './MemberAssignmentModal';
import TaskModal from './TaskModal';
import Portal from '../../shared/Portal';
import { cardsApi } from '../../../services/trelloBoardsApi';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'members' | 'files' | 'activity'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Card>>(card);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Extended project data
  const [projectData, setProjectData] = useState({
    budget: 0,
    status: 'planning',
    priority: 'medium',
    startDate: '',
    endDate: '',
    progress: 0,
    category: '',
    objectives: [] as string[],
  });

  // Note: boardMembers now comes from props

  // Load real data when card changes
  useEffect(() => {
    setEditData(card);
    setIsEditing(false);

    if (card._id) {
      loadCardData();
    }
  }, [card]);

  const loadCardData = async () => {
    setIsLoading(true);
    try {
      // Get detailed card data with tasks and comments from backend
      const cardData = await cardsApi.getCard(card._id);

      // Set tasks from backend
      if (cardData.tasks) {
        setTasks(cardData.tasks);
      } else {
        setTasks([]);
      }

      // Set comments from backend
      if (cardData.comments) {
        setComments(cardData.comments);
      } else {
        setComments([]);
      }

      // Set files from backend
      if (cardData.attachments) {
        const formattedFiles = cardData.attachments.map(attachment => ({
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
      await onUpdateCard(card._id, editData);
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
      setTasks([...tasks, newTaskFromAPI]);
      setNewTask('');
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error adding task:', error);
      // Fallback to local update if API fails
      const task: Task = {
        _id: `task_${Date.now()}`,
        title: newTask.trim(),
        completed: false,
        priority: 'medium',
        createdAt: new Date()
      };
      setTasks([...tasks, task]);
      setNewTask('');
      setShowTaskForm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };

    // Optimistically update UI
    setTasks(tasks.map(t =>
      t._id === taskId ? updatedTask : t
    ));

    try {
      await cardsApi.updateTask(card._id, taskId, { completed: !task.completed });
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert on error
      setTasks(tasks.map(t =>
        t._id === taskId ? task : t
      ));
    }
  };

  // Member management functions
  const handleAddMember = async (userId: string, role: string) => {
    try {
      await cardsApi.addMember(card._id, userId);

      // Find the user and add to local state
      const user = boardMembers.find(u => u._id === userId);
      if (user) {
        const newMember = {
          userId: user,
          role,
          assignedAt: new Date()
        };

        const updatedCard = {
          ...editData,
          members: [...(editData.members || []), newMember]
        };
        setEditData(updatedCard);
      }
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await cardsApi.removeMember(card._id, userId);

      // Update local state
      const updatedMembers = (editData.members || []).filter(member => member.userId._id !== userId);
      const updatedCard = { ...editData, members: updatedMembers };
      setEditData(updatedCard);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    // Update local state immediately
    const updatedMembers = (editData.members || []).map(member =>
      member.userId._id === userId ? { ...member, role: newRole } : member
    );
    const updatedCard = { ...editData, members: updatedMembers };
    setEditData(updatedCard);

    // TODO: Implement role update API call when backend supports it
    // For now, just update locally
  };

  // Task management functions
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Update local state immediately
    setTasks(prev => prev.map(task =>
      task._id === taskId ? { ...task, ...updates } : task
    ));

    try {
      await cardsApi.updateTask(card._id, taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      // TODO: Revert changes on error
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await cardsApi.deleteTask(card._id, taskId);
      setTasks(prev => prev.filter(task => task._id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
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
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            projectData.status === 'completed' ? 'bg-green-100 text-green-600' :
            projectData.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
            projectData.status === 'on-hold' ? 'bg-yellow-100 text-yellow-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {projectData.status.charAt(0).toUpperCase() + projectData.status.slice(1)}
          </span>

          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            projectData.priority === 'high' ? 'bg-red-100 text-red-600' :
            projectData.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
            'bg-green-100 text-green-600'
          }`}>
            {projectData.priority.charAt(0).toUpperCase() + projectData.priority.slice(1)}
          </span>
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
                      onClick={() => setEditData(prev => ({ ...prev, color: color === '#ffffff' ? null : color }))}
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
                      onClick={() => setEditData(prev => ({ ...prev, color: null }))}
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
              <span className="text-gray-900 dark:text-white">{projectData.startDate || 'Not set'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">End:</span>
              <span className="text-gray-900 dark:text-white">{projectData.endDate || 'Not set'}</span>
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Budget</h4>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              ${projectData.budget.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

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
          {canEdit && (
            <button
              onClick={() => setShowMemberModal(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          )}
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

  const renderMembersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Team Members ({card.members.length})
        </h3>
        {canEdit && (
          <button
            onClick={() => setShowMemberModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      <div className="space-y-3">
        {card.members.map((member) => (
          <div key={member.userId._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              {member.userId.avatar ? (
                <img
                  src={member.userId.avatar}
                  alt={`${member.userId.firstName} ${member.userId.lastName}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                  {member.userId.firstName.charAt(0)}{member.userId.lastName.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {member.userId.firstName} {member.userId.lastName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {member.role || 'Member'}
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Joined {formatDate(member.assignedAt || card.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFilesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Files ({files.length})
        </h3>
        {canEdit && (
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            <Paperclip className="w-4 h-4" />
            Upload File
          </button>
        )}
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div key={file._id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">{file.filename}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>by {file.uploadedBy.firstName} {file.uploadedBy.lastName}</span>
                <span>•</span>
                <span>{formatDate(file.uploadedAt)}</span>
              </div>
            </div>
            <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
              Download
            </button>
          </div>
        ))}

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No files uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Activity & Comments ({comments.length})
      </h3>

      {/* Add Comment */}
      <form onSubmit={handleAddComment} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm"
          >
            <Send className="w-4 h-4" />
            Comment
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium">
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.userId.firstName} {comment.userId.lastName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {comment.content}
                </p>
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
          </div>
        )}
      </div>
    </div>
  );

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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare },
              { id: 'members', label: 'Members', icon: Users },
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
          {activeTab === 'members' && renderMembersTab()}
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

      {/* Member Assignment Modal */}
      <MemberAssignmentModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        currentMembers={editData.members || []}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateMemberRole={handleUpdateMemberRole}
        boardMembers={boardMembers}
      />

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