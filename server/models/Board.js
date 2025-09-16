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
    maxlength: [300, 'Board description cannot be more than 300 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
  },
  lists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  }],
  backgroundColor: {
    type: String,
    default: '#0079bf',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  backgroundImage: {
    type: String,
    default: null
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateCategory: {
    type: String,
    enum: ['project_management', 'hr', 'marketing', 'development', 'design', 'other'],
    required: function() {
      return this.isTemplate;
    }
  },
  settings: {
    voting: {
      type: Boolean,
      default: false
    },
    comments: {
      type: Boolean,
      default: true
    },
    selfJoin: {
      type: Boolean,
      default: false
    },
    cardCover: {
      type: Boolean,
      default: true
    },
    cardAging: {
      type: Boolean,
      default: false
    }
  },
  starred: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  labels: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Label name cannot be more than 50 characters']
    },
    color: {
      type: String,
      required: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
    }
  }],
  position: {
    type: Number,
    default: 0
  },
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

boardSchema.virtual('listCount').get(function() {
  return this.lists ? this.lists.length : 0;
});

boardSchema.virtual('cardCount').get(async function() {
  const List = mongoose.model('List');
  const lists = await List.find({ board: this._id });
  return lists.reduce((total, list) => total + (list.cards ? list.cards.length : 0), 0);
});

boardSchema.virtual('isStarred').get(function() {
  if (!this._currentUser) return false;
  return this.starred.includes(this._currentUser);
});

boardSchema.virtual('isWatched').get(function() {
  if (!this._currentUser) return false;
  return this.watchers.includes(this._currentUser);
});

boardSchema.methods.addLabel = function(name, color) {
  const existingLabel = this.labels.find(label => label.name === name);
  if (!existingLabel) {
    this.labels.push({ name, color });
    return this.save();
  }
  return Promise.resolve(this);
};

boardSchema.methods.removeLabel = function(labelId) {
  this.labels = this.labels.filter(label => label._id.toString() !== labelId.toString());
  return this.save();
};

boardSchema.methods.updateLabel = function(labelId, name, color) {
  const label = this.labels.id(labelId);
  if (label) {
    label.name = name;
    label.color = color;
    return this.save();
  }
  return Promise.resolve(this);
};

boardSchema.methods.toggleStar = function(userId) {
  const index = this.starred.indexOf(userId);
  if (index > -1) {
    this.starred.splice(index, 1);
  } else {
    this.starred.push(userId);
  }
  return this.save();
};

boardSchema.methods.toggleWatch = function(userId) {
  const index = this.watchers.indexOf(userId);
  if (index > -1) {
    this.watchers.splice(index, 1);
  } else {
    this.watchers.push(userId);
  }
  return this.save();
};

boardSchema.methods.canUserAccess = async function(user) {
  const Project = mongoose.model('Project');
  const project = await Project.findById(this.project);

  if (!project) return false;

  return project.canUserAccess(user);
};

boardSchema.pre('save', function(next) {
  if (this.isModified('isArchived') && this.isArchived) {
    this.archivedAt = new Date();
  }
  next();
});

boardSchema.index({ project: 1, position: 1 });
boardSchema.index({ name: 1 });
boardSchema.index({ createdBy: 1 });
boardSchema.index({ isArchived: 1 });
boardSchema.index({ starred: 1 });
boardSchema.index({ watchers: 1 });

module.exports = mongoose.model('Board', boardSchema);