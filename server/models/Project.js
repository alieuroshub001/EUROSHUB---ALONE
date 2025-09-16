const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Project description cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project owner is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  boards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board'
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    allowFileAttachments: {
      type: Boolean,
      default: true
    },
    autoAssignEnabled: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot be more than 30 characters']
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

projectSchema.virtual('boardCount').get(function() {
  return this.boards ? this.boards.length : 0;
});

projectSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

projectSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < Date.now() && this.status !== 'completed';
});

projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

projectSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member ? member.role : null;
};

projectSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
  return this.save();
};

projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  return this.save();
};

projectSchema.methods.canUserAccess = function(user) {
  if (user.role === 'superadmin' || user.role === 'admin') {
    return true;
  }

  if (this.owner.toString() === user._id.toString()) {
    return true;
  }

  if (this.settings.isPrivate) {
    return this.isMember(user._id);
  }

  return true;
};

projectSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    this.archivedAt = new Date();
  }
  next();
});

projectSchema.index({ name: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ dueDate: 1 });
projectSchema.index({ tags: 1 });

module.exports = mongoose.model('Project', projectSchema);