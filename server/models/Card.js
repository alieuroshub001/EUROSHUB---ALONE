const mongoose = require('mongoose');

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
    maxlength: [2000, 'Card description cannot be more than 2000 characters']
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List',
    required: [true, 'List is required']
  },
  position: {
    type: Number,
    required: true,
    default: 0
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  assignedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  dueDateComplete: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    max: [1000, 'Estimated hours cannot exceed 1000']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  coverImage: {
    url: {
      type: String
    },
    color: {
      type: String,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
    },
    isSizeSmall: {
      type: Boolean,
      default: false
    }
  },
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  checklist: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Checklist name cannot be more than 100 characters']
    },
    items: [{
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Checklist item cannot be more than 200 characters']
      },
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      position: {
        type: Number,
        default: 0
      }
    }],
    position: {
      type: Number,
      default: 0
    }
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  customFields: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'dropdown', 'checkbox'],
      required: true
    },
    value: mongoose.Schema.Types.Mixed,
    options: [String] // For dropdown type
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

cardSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < Date.now() && !this.isCompleted;
});

cardSchema.virtual('timeRemaining').get(function() {
  if (!this.dueDate || this.isCompleted) return null;
  return Math.max(0, this.dueDate - Date.now());
});

cardSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

cardSchema.virtual('attachmentCount').get(function() {
  return this.attachments ? this.attachments.length : 0;
});

cardSchema.virtual('checklistProgress').get(function() {
  if (!this.checklist || this.checklist.length === 0) return null;

  const totalItems = this.checklist.reduce((sum, list) => sum + list.items.length, 0);
  const completedItems = this.checklist.reduce((sum, list) =>
    sum + list.items.filter(item => item.isCompleted).length, 0);

  return {
    completed: completedItems,
    total: totalItems,
    percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  };
});

cardSchema.virtual('progressPercentage').get(function() {
  if (this.isCompleted) return 100;

  const checklistProgress = this.checklistProgress;
  if (checklistProgress && checklistProgress.total > 0) {
    return checklistProgress.percentage;
  }

  if (this.estimatedHours && this.actualHours) {
    return Math.min(100, Math.round((this.actualHours / this.estimatedHours) * 100));
  }

  return 0;
});

cardSchema.methods.addComment = function(commentId) {
  this.comments.push(commentId);
  return this.save();
};

cardSchema.methods.removeComment = function(commentId) {
  this.comments = this.comments.filter(comment => comment.toString() !== commentId.toString());
  return this.save();
};

cardSchema.methods.addAttachment = function(attachment) {
  this.attachments.push(attachment);
  return this.save();
};

cardSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments = this.attachments.filter(attachment =>
    attachment._id.toString() !== attachmentId.toString()
  );
  return this.save();
};

cardSchema.methods.addChecklist = function(name) {
  this.checklist.push({
    name,
    items: [],
    position: this.checklist.length
  });
  return this.save();
};

cardSchema.methods.addChecklistItem = function(checklistId, text) {
  const checklist = this.checklist.id(checklistId);
  if (checklist) {
    checklist.items.push({
      text,
      isCompleted: false,
      position: checklist.items.length
    });
    return this.save();
  }
  return Promise.resolve(this);
};

cardSchema.methods.toggleChecklistItem = function(checklistId, itemId, userId) {
  const checklist = this.checklist.id(checklistId);
  if (checklist) {
    const item = checklist.items.id(itemId);
    if (item) {
      item.isCompleted = !item.isCompleted;
      if (item.isCompleted) {
        item.completedAt = new Date();
        item.completedBy = userId;
      } else {
        item.completedAt = null;
        item.completedBy = null;
      }
      return this.save();
    }
  }
  return Promise.resolve(this);
};

cardSchema.methods.assignMember = function(userId) {
  if (!this.assignedMembers.includes(userId)) {
    this.assignedMembers.push(userId);
  }
  return this.save();
};

cardSchema.methods.unassignMember = function(userId) {
  this.assignedMembers = this.assignedMembers.filter(member =>
    member.toString() !== userId.toString()
  );
  return this.save();
};

cardSchema.methods.toggleWatch = function(userId) {
  const index = this.watchers.indexOf(userId);
  if (index > -1) {
    this.watchers.splice(index, 1);
  } else {
    this.watchers.push(userId);
  }
  return this.save();
};

cardSchema.methods.markComplete = function(userId) {
  this.isCompleted = true;
  this.completedAt = new Date();
  this.completedBy = userId;
  this.dueDateComplete = true;
  return this.save();
};

cardSchema.methods.markIncomplete = function() {
  this.isCompleted = false;
  this.completedAt = null;
  this.completedBy = null;
  this.dueDateComplete = false;
  return this.save();
};

cardSchema.methods.canUserAccess = async function(user) {
  const List = mongoose.model('List');
  const list = await List.findById(this.list);

  if (!list) return false;

  return list.canUserAccess(user);
};

cardSchema.pre('save', function(next) {
  if (this.isModified('isArchived') && this.isArchived) {
    this.archivedAt = new Date();
  }

  if (this.isModified('isCompleted') && this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

cardSchema.index({ list: 1, position: 1 });
cardSchema.index({ list: 1, isArchived: 1 });
cardSchema.index({ assignedMembers: 1 });
cardSchema.index({ dueDate: 1 });
cardSchema.index({ isCompleted: 1 });
cardSchema.index({ createdBy: 1 });
cardSchema.index({ watchers: 1 });
cardSchema.index({ labels: 1 });

module.exports = mongoose.model('Card', cardSchema);