const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Board name is required'],
    trim: true,
    maxlength: [100, 'Board name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Board description cannot be more than 500 characters']
  },
  background: {
    type: String,
    default: '#6366f1',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^https?:\/\//, 'Please provide a valid hex color or image URL']
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  // Board members (independent of projects)
  members: [{
    userId: {
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional project reference (for integration)
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  position: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  // Starred by users
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowAttachments: {
      type: Boolean,
      default: true
    },
    autoArchive: {
      type: Boolean,
      default: false
    },
    cardLimit: {
      type: Number,
      min: [0, 'Card limit cannot be negative'],
      default: 0 // 0 means no limit
    }
  },
  metadata: {
    totalLists: { type: Number, default: 0 },
    totalCards: { type: Number, default: 0 },
    completedCards: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for board lists
boardSchema.virtual('lists', {
  ref: 'List',
  localField: '_id',
  foreignField: 'board',
  options: { sort: { position: 1 } }
});

// Virtual for completion percentage
boardSchema.virtual('completionPercentage').get(function() {
  if (this.metadata.totalCards === 0) return 0;
  return Math.round((this.metadata.completedCards / this.metadata.totalCards) * 100);
});

// Static method to get user's accessible boards
boardSchema.statics.getAccessibleBoards = async function(userId, userRole) {
  let query = {};

  if (['superadmin', 'admin'].includes(userRole)) {
    // Superadmin and admin can access all boards
    query = { isArchived: false };
  } else {
    // Other users can only access boards they created or are members of
    query = {
      isArchived: false,
      $or: [
        { createdBy: userId },
        { 'members.userId': userId }
      ]
    };
  }

  return this.find(query)
    .populate('createdBy', 'firstName lastName avatar')
    .populate('members.userId', 'firstName lastName avatar')
    .sort({ position: 1, createdAt: -1 });
};

// Instance method to check if user has board access
boardSchema.methods.hasAccess = async function(userId, userRole) {
  // Superadmin and admin have access to all boards
  if (['superadmin', 'admin'].includes(userRole)) {
    return true;
  }

  // Check if user is the creator
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }

  // Check if user is a member of the board
  if (this.members && Array.isArray(this.members)) {
    return this.members.some(member =>
      member.userId && member.userId.toString() === userId.toString()
    );
  }

  return false;
};

// Instance method to check specific permissions
boardSchema.methods.hasPermission = async function(userId, action, userRole) {
  // First check if user has access to the board
  if (!await this.hasAccess(userId, userRole)) {
    return false;
  }

  // Get user's role on this board
  const boardRole = this.getUserRole(userId);

  // Define permissions based on role and action
  const permissions = {
    owner: ['read', 'write', 'delete', 'manage_members', 'manage_settings'],
    admin: ['read', 'write', 'manage_members'],
    member: ['read', 'write'],
    viewer: ['read']
  };

  return permissions[boardRole] && permissions[boardRole].includes(action);
};

// Instance method to get user's role on this board
boardSchema.methods.getUserRole = function(userId) {
  // Check if user is the creator (always owner)
  if (this.createdBy.toString() === userId.toString()) {
    return 'owner';
  }

  // Check user's role in members array
  if (this.members && Array.isArray(this.members)) {
    const member = this.members.find(member =>
      member.userId && member.userId.toString() === userId.toString()
    );
    return member ? member.role : 'viewer';
  }

  return 'viewer';
};

// Instance method to add member to board
boardSchema.methods.addMember = async function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(member =>
    member.userId && member.userId.toString() === userId.toString()
  );

  if (existingMember) {
    // Update existing member's role
    existingMember.role = role;
  } else {
    // Add new member
    this.members.push({
      userId: userId,
      role: role,
      joinedAt: new Date()
    });
  }

  return await this.save();
};

// Instance method to remove member from board
boardSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member =>
    !member.userId || member.userId.toString() !== userId.toString()
  );

  return await this.save();
};

// Instance method to toggle star
boardSchema.methods.toggleStar = async function(userId) {
  const isStarred = this.starredBy.includes(userId);

  if (isStarred) {
    this.starredBy = this.starredBy.filter(id => id.toString() !== userId.toString());
  } else {
    this.starredBy.push(userId);
  }

  return await this.save();
};

// Pre-save middleware to set up new boards
boardSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Automatically add creator as owner member
    if (!this.members.some(member => member.userId.toString() === this.createdBy.toString())) {
      this.members.push({
        userId: this.createdBy,
        role: 'owner',
        joinedAt: new Date()
      });
    }

    // Update project's total boards count if linked to project
    if (this.project) {
      const Project = mongoose.model('Project');
      await Project.findByIdAndUpdate(this.project, {
        $inc: { 'metadata.totalBoards': 1 }
      });
    }

    // Set default position if not provided (for user's personal boards)
    if (this.position === 0) {
      const maxPosition = await this.constructor.findOne(
        { createdBy: this.createdBy },
        {},
        { sort: { position: -1 } }
      );
      this.position = maxPosition ? maxPosition.position + 1 : 1;
    }
  }
  next();
});

// Pre-remove middleware to update project metadata
boardSchema.pre('remove', async function(next) {
  // Update project's total boards count
  const Project = mongoose.model('Project');
  await Project.findByIdAndUpdate(this.project, {
    $inc: { 'metadata.totalBoards': -1 }
  });

  // Remove all lists and cards associated with this board
  const List = mongoose.model('List');
  const Card = mongoose.model('Card');

  const lists = await List.find({ board: this._id });
  for (const list of lists) {
    await Card.deleteMany({ list: list._id });
    await list.remove();
  }

  next();
});

// Indexes for performance
boardSchema.index({ project: 1, position: 1 });
boardSchema.index({ project: 1, isArchived: 1 });
boardSchema.index({ createdBy: 1 });
boardSchema.index({ createdAt: -1 });

// Compound index for efficient querying
boardSchema.index({
  project: 1,
  isArchived: 1,
  position: 1
});

module.exports = mongoose.model('Board', boardSchema);