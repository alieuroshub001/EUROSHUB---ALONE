'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Calendar, User, Tag, AlertCircle, MessageSquare, Paperclip, Image, Send, Download, Trash2 } from 'lucide-react';

interface TaskData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  dueDate?: string;
  tags: string[];
  comments?: Comment[];
  attachments?: Attachment[];
}

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  uploadedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

interface EnhancedEditTaskModalProps {
  task: TaskData & { id: string; commentsData?: Comment[]; attachmentsData?: Attachment[] };
  onClose: () => void;
  onSubmit: (taskId: string, taskData: TaskData) => void;
  onAddComment: (taskId: string, comment: string) => Promise<void>;
  onUploadFile: (taskId: string, file: File) => Promise<void>;
  onDeleteAttachment: (taskId: string, attachmentId: string) => Promise<void>;
  teamMembers: TeamMember[];
  currentUser: { id: string; name: string; avatar?: string };
}

const EnhancedEditTaskModal: React.FC<EnhancedEditTaskModalProps> = ({
  task,
  onClose,
  onSubmit,
  onAddComment,
  onUploadFile,
  onDeleteAttachment,
  teamMembers,
  currentUser
}) => {
  const [formData, setFormData] = useState<TaskData>({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    assignees: task.assignees,
    dueDate: task.dueDate || '',
    tags: task.tags,
    comments: task.commentsData || [],
    attachments: task.attachmentsData || []
  });

  const [newTag, setNewTag] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to safely get member name
  const getMemberName = (member: TeamMember): string => {
    return member.name || 'Unknown User';
  };

  // Helper function to safely get user name from various user objects
  const getUserName = (user: { name: string } | { name: { name: string } } | any): string => {
    if (typeof user.name === 'string') {
      return user.name;
    }
    if (user.name && typeof user.name.name === 'string') {
      return user.name.name;
    }
    return 'Unknown User';
  };

  // Sync formData with task prop when it changes (for real-time updates)
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignees: task.assignees,
      dueDate: task.dueDate || '',
      tags: task.tags,
      comments: task.commentsData || [],
      attachments: task.attachmentsData || []
    });
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onSubmit(task.id, formData);
        onClose();
      } catch (error) {
        console.error('Failed to update task:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleToggleAssignee = (memberName: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(memberName)
        ? prev.assignees.filter(name => name !== memberName)
        : [...prev.assignees, memberName]
    }));
  };

  const handleAddComment = async () => {
    if (newComment.trim()) {
      try {
        await onAddComment(task.id, newComment.trim());
        setNewComment('');
        // Comment will be added to the task via parent component update
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        await onUploadFile(task.id, file);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await onDeleteAttachment(task.id, attachmentId);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadAttachment = async (attachment: any) => {
    console.log('Downloading attachment:', attachment); // Debug log
    console.log('Task ID:', task.id, 'Attachment ID:', attachment.id); // Debug log

    // Use direct blob download approach for better reliability
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name; // Use original filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Final fallback to opening in new tab
      window.open(attachment.url, '_blank');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-200 text-red-700';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'low': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const isImage = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Comments ({formData.comments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'attachments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Attachments ({formData.attachments?.length || 0})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter task description"
                />
              </div>

              {/* Priority and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Assignees */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignees
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                  >
                    <span className="text-gray-700">
                      {formData.assignees.length > 0
                        ? `${formData.assignees.length} member(s) selected`
                        : 'Select team members'}
                    </span>
                    <User size={16} className="text-gray-400" />
                  </button>

                  {showAssigneeDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowAssigneeDropdown(false)}
                      />
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {teamMembers.map((member) => {
                          const memberName = getMemberName(member);
                          return (
                            <label
                              key={member.id}
                              className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.assignees.includes(memberName)}
                                onChange={() => handleToggleAssignee(memberName)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
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
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{memberName}</p>
                                  <p className="text-xs text-gray-500">{member.role}</p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Selected Assignees */}
                {formData.assignees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.assignees.map((assigneeName) => {
                      return (
                        <span
                          key={assigneeName}
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          <span>{assigneeName}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleAssignee(assigneeName)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add a tag"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.title.trim()}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* Comments List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {formData.comments && formData.comments.length > 0 ? (
                  formData.comments.map((comment) => {
                    const authorName = getUserName(comment.author);
                    return (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                            {comment.author.avatar ? (
                              <img
                                src={comment.author.avatar}
                                alt={authorName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              authorName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-gray-900">{authorName}</p>
                              <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={16} />
                        <span>Comment</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
                <div className="space-y-4">
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Paperclip size={16} />
                      <span>Upload Files</span>
                    </button>
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.accept = 'image/*';
                          fileInputRef.current.click();
                        }
                      }}
                      disabled={isUploadingFile}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Image size={16} />
                      <span>Upload Images</span>
                    </button>
                  </div>
                  {isUploadingFile && (
                    <div className="flex items-center justify-center space-x-2 text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    Upload files, images, documents, or any other files related to this task
                  </p>
                </div>
              </div>

              {/* Attachments List */}
              <div className="space-y-3">
                {formData.attachments && formData.attachments.length > 0 ? (
                  formData.attachments.map((attachment) => {
                    const uploaderName = getUserName(attachment.uploadedBy);
                    return (
                      <div key={attachment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            {isImage(attachment.name) ? (
                              <Image size={20} className="text-blue-600" />
                            ) : (
                              <Paperclip size={20} className="text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)} • Uploaded by {uploaderName} • {formatDate(attachment.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Paperclip size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No attachments yet. Upload files to get started!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedEditTaskModal;