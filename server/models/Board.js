const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Board title is required'],
    trim: true,
    maxlength: [100, 'Board title cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Board description cannot be more than 500 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#4F46E5',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  position: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
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
  const Project = mongoose.model('Project');

  let projectQuery = {};

  if (['superadmin', 'admin'].includes(userRole)) {
    // Superadmin and admin can access all boards
    projectQuery = {};
  } else {
    // Other users can only access boards from projects they're members of
    projectQuery = {
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    };
  }

  const projects = await Project.find(projectQuery).select('_id');
  const projectIds = projects.map(p => p._id);

  return this.find({
    project: { $in: projectIds },
    isArchived: false
  }).populate('project', 'title').sort({ position: 1, createdAt: -1 });
};

// Instance method to check if user has board access
boardSchema.methods.hasAccess = async function(userId, userRole) {
  const Project = mongoose.model('Project');

  // Superadmin and admin have access to all boards
  if (['superadmin', 'admin'].includes(userRole)) {
    return true;
  }

  const project = await Project.findById(this.project);
  if (!project) return false;

  // Check if user is project owner or member
  if (project.owner.toString() === userId.toString()) return true;
  return project.members.some(m => m.user.toString() === userId.toString());
};

// Instance method to check specific permissions
boardSchema.methods.hasPermission = async function(userId, action) {
  const Project = mongoose.model('Project');
  const project = await Project.findById(this.project);

  if (!project) return false;

  // Use project's permission system
  return project.hasPermission(userId, action);
};

// Pre-save middleware to update project metadata
boardSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Update project's total boards count
    const Project = mongoose.model('Project');
    await Project.findByIdAndUpdate(this.project, {
      $inc: { 'metadata.totalBoards': 1 }
    });

    // Set default position if not provided
    if (this.position === 0) {
      const maxPosition = await this.constructor.findOne(
        { project: this.project },
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