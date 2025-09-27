const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Checklist item cannot be more than 500 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Comment cannot be more than 2000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Label name cannot be more than 50 characters']
  },
  color: {
    type: String,
    required: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  }
});

const timeTrackingSchema = new mongoose.Schema({
  estimated: {
    type: Number,
    min: [0, 'Estimated time cannot be negative'],
    default: 0
  },
  spent: {
    type: Number,
    min: [0, 'Spent time cannot be negative'],
    default: 0
  },
  remaining: {
    type: Number,
    min: [0, 'Remaining time cannot be negative']
  },
  entries: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hours: {
      type: Number,
      required: true,
      min: [0.1, 'Time entry must be at least 0.1 hours']
    },
    description: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
});

// Task schema for tasks within cards (for project management)
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Task title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Task description cannot be more than 1000 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dueDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  position: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const cardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Card title is required'],
    trim: true,
    maxlength: [200, 'Card title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Card description cannot be more than 5000 characters']
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: [true, 'List is required']
  },
  // Board is optional for Trello-like boards (independent of projects)
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: false
  },
  // Project is optional for Trello-like boards (cards can represent projects)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Card members (for Trello-like boards)
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'viewer'],
      default: 'member'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  position: {
    type: Number,
    required: true,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['planning', 'open', 'in_progress', 'review', 'blocked', 'completed', 'on_hold'],
    default: 'planning'
  },
  dueDate: Date,
  startDate: Date,
  completedAt: Date,
  // Project-specific fields for Trello-style cards
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    default: 0
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot be more than 100 characters']
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  labels: [labelSchema],
  checklist: [checklistItemSchema],
  attachments: [attachmentSchema],
  comments: [commentSchema],
  // Tasks within the card/project
  tasks: [taskSchema],
  timeTracking: timeTrackingSchema,
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select']
    }
  }],
  // Visual customization for Trello-like cards
  color: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    default: null
  },
  coverImage: {
    type: String,
    trim: true,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if card is overdue
cardSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// Virtual for checklist completion percentage
cardSchema.virtual('checklistCompletion').get(function() {
  if (!this.checklist || this.checklist.length === 0) return 100;
  const completed = this.checklist.filter(item => item.completed).length;
  return Math.round((completed / this.checklist.length) * 100);
});

// Virtual for total time spent
cardSchema.virtual('totalTimeSpent').get(function() {
  if (!this.timeTracking || !this.timeTracking.entries) return 0;
  return this.timeTracking.entries.reduce((total, entry) => total + entry.hours, 0);
});

// Virtual for task completion percentage
cardSchema.virtual('taskCompletion').get(function() {
  if (!this.tasks || this.tasks.length === 0) return 100;
  const completed = this.tasks.filter(task => task.completed).length;
  return Math.round((completed / this.tasks.length) * 100);
});

// Virtual for project progress based on tasks and checklist
cardSchema.virtual('projectProgress').get(function() {
  const taskProgress = this.taskCompletion;
  const checklistProgress = this.checklistCompletion;

  // If both exist, average them; otherwise use the one that exists
  if (this.tasks.length > 0 && this.checklist.length > 0) {
    return Math.round((taskProgress + checklistProgress) / 2);
  } else if (this.tasks.length > 0) {
    return taskProgress;
  } else if (this.checklist.length > 0) {
    return checklistProgress;
  } else {
    return 0;
  }
});

// Instance method to check if user has card access
cardSchema.methods.hasAccess = async function(userId, userRole) {
  const List = mongoose.model('List');
  const list = await List.findById(this.listId);

  if (!list) return false;
  return await list.hasAccess(userId, userRole);
};

// Instance method to check specific permissions
cardSchema.methods.hasPermission = async function(userId, action, userRole) {
  const List = mongoose.model('List');
  const list = await List.findById(this.listId);

  if (!list) return false;
  return await list.hasPermission(userId, action, userRole);
};

// Instance method to assign users
cardSchema.methods.assignUsers = function(userIds, assignedBy) {
  // Remove duplicates and add new assignments
  const currentAssigned = this.assignedTo.map(id => id.toString());
  const newAssignments = userIds.filter(id => !currentAssigned.includes(id.toString()));

  this.assignedTo.push(...newAssignments);

  // Add assignor and assignees as watchers if not already watching
  const watcherIds = this.watchers.map(id => id.toString());
  const newWatchers = [assignedBy, ...userIds].filter(id => !watcherIds.includes(id.toString()));
  this.watchers.push(...newWatchers);

  return this;
};

// Instance method to unassign users
cardSchema.methods.unassignUsers = function(userIds) {
  this.assignedTo = this.assignedTo.filter(id => !userIds.includes(id.toString()));
  return this;
};

// Instance method to add comment
cardSchema.methods.addComment = function(text, authorId, mentions = []) {
  const comment = {
    text,
    author: authorId,
    mentions
  };

  this.comments.push(comment);

  // Add commenter and mentioned users as watchers
  const watcherIds = this.watchers.map(id => id.toString());
  const newWatchers = [authorId, ...mentions].filter(id => !watcherIds.includes(id.toString()));
  this.watchers.push(...newWatchers);

  return this;
};

// Instance method to update comment
cardSchema.methods.updateComment = function(commentId, text, editorId) {
  const comment = this.comments.id(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }

  // Only comment author can edit
  if (comment.author.toString() !== editorId.toString()) {
    throw new Error('Only comment author can edit the comment');
  }

  comment.text = text;
  comment.isEdited = true;
  comment.editedAt = new Date();

  return this;
};

// Instance method to delete comment
cardSchema.methods.deleteComment = function(commentId, deleterId, deleterRole) {
  const comment = this.comments.id(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }

  // Only comment author or admin roles can delete
  const canDelete = comment.author.toString() === deleterId.toString() ||
                   ['superadmin', 'admin'].includes(deleterRole);

  if (!canDelete) {
    throw new Error('You can only delete your own comments');
  }

  comment.remove();
  return this;
};

// Instance method to add time entry
cardSchema.methods.addTimeEntry = function(userId, hours, description = '') {
  if (!this.timeTracking) {
    this.timeTracking = { entries: [] };
  }

  this.timeTracking.entries.push({
    user: userId,
    hours,
    description,
    date: new Date()
  });

  // Update spent time
  this.timeTracking.spent = (this.timeTracking.spent || 0) + hours;

  // Update remaining time if estimated time is set
  if (this.timeTracking.estimated) {
    this.timeTracking.remaining = Math.max(0, this.timeTracking.estimated - this.timeTracking.spent);
  }

  // Add user as watcher
  const watcherIds = this.watchers.map(id => id.toString());
  if (!watcherIds.includes(userId.toString())) {
    this.watchers.push(userId);
  }

  return this;
};

// Instance method to move to list
cardSchema.methods.moveToList = async function(targetListId, position) {
  const List = mongoose.model('List');
  const oldList = await List.findById(this.listId);
  const newList = await List.findById(targetListId);

  if (!newList) {
    throw new Error('Target list not found');
  }

  // Update old list metadata
  if (oldList) {
    await oldList.updateOne({
      $inc: { 'metadata.cardCount': -1 }
    });
  }

  // Update new list metadata
  await newList.updateOne({
    $inc: { 'metadata.cardCount': 1 }
  });

  // Update card
  this.listId = targetListId;
  if (position !== undefined) {
    this.position = position;
  } else {
    // Set to end of list
    const lastCard = await this.constructor.findOne({ listId: targetListId }).sort({ position: -1 });
    this.position = lastCard ? lastCard.position + 1 : 1;
  }

  return this;
};

// Instance method to add member to card
cardSchema.methods.addMember = async function(userId) {
  // Check if user is already a member
  const existingMember = this.members.find(member =>
    member.userId && member.userId.toString() === userId.toString()
  );

  if (!existingMember) {
    this.members.push({
      userId: userId,
      role: 'member'
    });

    // Add as watcher if not already watching
    const watcherIds = this.watchers.map(id => id.toString());
    if (!watcherIds.includes(userId.toString())) {
      this.watchers.push(userId);
    }
  }

  return await this.save();
};

// Instance method to remove member from card
cardSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member =>
    !member.userId || member.userId.toString() !== userId.toString()
  );

  return await this.save();
};

// Instance method to add task to card
cardSchema.methods.addTask = function(taskData, createdBy) {
  // Set position for new task
  const maxPosition = Math.max(...this.tasks.map(t => t.position), 0);
  const task = {
    ...taskData,
    position: maxPosition + 1,
    createdBy: createdBy
  };

  this.tasks.push(task);
  return this;
};

// Instance method to update task
cardSchema.methods.updateTask = function(taskId, updateData) {
  const task = this.tasks.id(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  Object.assign(task, updateData);

  // Handle completion
  if (updateData.completed !== undefined) {
    if (updateData.completed && !task.completedAt) {
      task.completedAt = new Date();
      task.completedBy = updateData.completedBy || task.assignedTo || task.createdBy;
    } else if (!updateData.completed) {
      task.completedAt = null;
      task.completedBy = null;
    }
  }

  return this;
};

// Instance method to delete task
cardSchema.methods.deleteTask = function(taskId) {
  const task = this.tasks.id(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  task.remove();
  return this;
};

// Instance method to reorder task
cardSchema.methods.reorderTask = function(taskId, newPosition) {
  const task = this.tasks.id(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  task.position = newPosition;
  return this;
};

// Pre-save middleware to set position and update metadata
cardSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Set position if not provided
    if (this.position === 0) {
      const maxPosition = await this.constructor.findOne(
        { listId: this.listId },
        {},
        { sort: { position: -1 } }
      );
      this.position = maxPosition ? maxPosition.position + 1 : 1;
    }

    // Update metadata counts
    const List = mongoose.model('List');

    await List.findByIdAndUpdate(this.listId, {
      $inc: { 'metadata.cardCount': 1 }
    });

    // Update board metadata if card belongs to a board
    if (this.boardId) {
      const Board = mongoose.model('Board');
      await Board.findByIdAndUpdate(this.boardId, {
        $inc: { 'metadata.totalCards': 1 }
      });
    }

    // Update project metadata if card belongs to a project
    if (this.project) {
      const Project = mongoose.model('Project');
      await Project.findByIdAndUpdate(this.project, {
        $inc: { 'metadata.totalTasks': 1 }
      });
    }

    // Add creator as watcher
    if (!this.watchers.includes(this.createdBy)) {
      this.watchers.push(this.createdBy);
    }
  }

  // Handle status changes
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
      this.completedBy = this.assignedTo.length > 0 ? this.assignedTo[0] : this.createdBy;

      // Update completed tasks count
      const List = mongoose.model('List');

      await List.findByIdAndUpdate(this.listId, {
        $inc: { 'metadata.completedCards': 1 }
      });

      // Update board metadata if card belongs to a board
      if (this.boardId) {
        const Board = mongoose.model('Board');
        await Board.findByIdAndUpdate(this.boardId, {
          $inc: { 'metadata.completedCards': 1 }
        });
      }

      // Update project metadata if card belongs to a project
      if (this.project) {
        const Project = mongoose.model('Project');
        await Project.findByIdAndUpdate(this.project, {
          $inc: { 'metadata.completedTasks': 1 }
        });
      }
    } else if (this.status !== 'completed' && this.completedAt) {
      // Moving from completed back to other status
      this.completedAt = null;
      this.completedBy = null;

      // Decrease completed tasks count
      const List = mongoose.model('List');

      await List.findByIdAndUpdate(this.listId, {
        $inc: { 'metadata.completedCards': -1 }
      });

      // Update board metadata if card belongs to a board
      if (this.boardId) {
        const Board = mongoose.model('Board');
        await Board.findByIdAndUpdate(this.boardId, {
          $inc: { 'metadata.completedCards': -1 }
        });
      }

      // Update project metadata if card belongs to a project
      if (this.project) {
        const Project = mongoose.model('Project');
        await Project.findByIdAndUpdate(this.project, {
          $inc: { 'metadata.completedTasks': -1 }
        });
      }
    }
  }

  next();
});

// Pre-remove middleware to update metadata
cardSchema.pre('remove', async function(next) {
  const List = mongoose.model('List');

  // Decrease counts
  await List.findByIdAndUpdate(this.listId, {
    $inc: {
      'metadata.cardCount': -1,
      'metadata.completedCards': this.status === 'completed' ? -1 : 0
    }
  });

  // Update board metadata if card belongs to a board
  if (this.boardId) {
    const Board = mongoose.model('Board');
    await Board.findByIdAndUpdate(this.boardId, {
      $inc: {
        'metadata.totalCards': -1,
        'metadata.completedCards': this.status === 'completed' ? -1 : 0
      }
    });
  }

  // Update project metadata if card belongs to a project
  if (this.project) {
    const Project = mongoose.model('Project');
    await Project.findByIdAndUpdate(this.project, {
      $inc: {
        'metadata.totalTasks': -1,
        'metadata.completedTasks': this.status === 'completed' ? -1 : 0
      }
    });
  }

  next();
});

// Indexes for performance
cardSchema.index({ listId: 1, position: 1 });
cardSchema.index({ boardId: 1, status: 1 });
cardSchema.index({ project: 1, assignedTo: 1 });
cardSchema.index({ assignedTo: 1, dueDate: 1 });
cardSchema.index({ dueDate: 1, status: 1 });
cardSchema.index({ createdBy: 1 });
cardSchema.index({ watchers: 1 });
cardSchema.index({ isArchived: 1 });
cardSchema.index({ 'labels.name': 1 });
cardSchema.index({ 'members.userId': 1 });

// Compound indexes
cardSchema.index({
  listId: 1,
  isArchived: 1,
  position: 1
});

cardSchema.index({
  assignedTo: 1,
  status: 1,
  dueDate: 1
});

module.exports = mongoose.model('Card', cardSchema);