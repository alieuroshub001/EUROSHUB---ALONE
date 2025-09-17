const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'List title is required'],
    trim: true,
    maxlength: [100, 'List title cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'List description cannot be more than 500 characters']
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board is required']
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
  position: {
    type: Number,
    required: true,
    default: 0
  },
  color: {
    type: String,
    default: '#6B7280',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  listType: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done', 'custom'],
    default: 'custom'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  settings: {
    cardLimit: {
      type: Number,
      min: [0, 'Card limit cannot be negative'],
      default: 0 // 0 means no limit
    },
    autoMove: {
      enabled: {
        type: Boolean,
        default: false
      },
      conditions: [{
        field: {
          type: String,
          enum: ['dueDate', 'assignee', 'labels', 'checklist']
        },
        operator: {
          type: String,
          enum: ['equals', 'contains', 'completed', 'overdue']
        },
        value: mongoose.Schema.Types.Mixed,
        targetList: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'List'
        }
      }]
    },
    wipLimit: {
      enabled: {
        type: Boolean,
        default: false
      },
      limit: {
        type: Number,
        min: [1, 'WIP limit must be at least 1'],
        default: 5
      }
    }
  },
  metadata: {
    cardCount: { type: Number, default: 0 },
    completedCards: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for list cards
listSchema.virtual('cards', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'list',
  options: { sort: { position: 1 } }
});

// Virtual for checking if WIP limit is exceeded
listSchema.virtual('isWipLimitExceeded').get(function() {
  if (!this.settings.wipLimit.enabled) return false;
  return this.metadata.cardCount > this.settings.wipLimit.limit;
});

// Static method to create default lists for a board
listSchema.statics.createDefaultLists = async function(boardId, projectId, createdBy) {
  const defaultLists = [
    { title: 'To Do', listType: 'todo', position: 1, color: '#EF4444' },
    { title: 'In Progress', listType: 'in_progress', position: 2, color: '#F59E0B' },
    { title: 'Review', listType: 'review', position: 3, color: '#8B5CF6' },
    { title: 'Done', listType: 'done', position: 4, color: '#10B981' }
  ];

  const lists = defaultLists.map(list => ({
    ...list,
    board: boardId,
    project: projectId,
    createdBy: createdBy,
    isDefault: true
  }));

  return await this.create(lists);
};

// Instance method to check if user has list access
listSchema.methods.hasAccess = async function(userId, userRole) {
  const Board = mongoose.model('Board');
  const board = await Board.findById(this.board);

  if (!board) return false;
  return await board.hasAccess(userId, userRole);
};

// Instance method to check specific permissions
listSchema.methods.hasPermission = async function(userId, action) {
  const Board = mongoose.model('Board');
  const board = await Board.findById(this.board);

  if (!board) return false;
  return await board.hasPermission(userId, action);
};

// Instance method to move cards to another list
listSchema.methods.moveAllCardsTo = async function(targetListId) {
  const Card = mongoose.model('Card');
  const targetList = await this.constructor.findById(targetListId);

  if (!targetList) {
    throw new Error('Target list not found');
  }

  // Get all cards in this list
  const cards = await Card.find({ list: this._id }).sort({ position: 1 });

  // Get the highest position in target list
  const lastCard = await Card.findOne({ list: targetListId }).sort({ position: -1 });
  let nextPosition = lastCard ? lastCard.position + 1 : 1;

  // Move all cards to target list
  for (const card of cards) {
    card.list = targetListId;
    card.position = nextPosition++;
    await card.save();
  }

  // Update metadata
  await this.updateOne({
    $set: { 'metadata.cardCount': 0 }
  });

  await targetList.updateOne({
    $inc: { 'metadata.cardCount': cards.length }
  });

  return cards.length;
};

// Instance method to reorder cards
listSchema.methods.reorderCards = async function(cardPositions) {
  const Card = mongoose.model('Card');

  const bulkOps = cardPositions.map(({ cardId, position }) => ({
    updateOne: {
      filter: { _id: cardId, list: this._id },
      update: { position: position }
    }
  }));

  if (bulkOps.length > 0) {
    await Card.bulkWrite(bulkOps);
  }
};

// Pre-save middleware to set position and update board metadata
listSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Set position if not provided
    if (this.position === 0) {
      const maxPosition = await this.constructor.findOne(
        { board: this.board },
        {},
        { sort: { position: -1 } }
      );
      this.position = maxPosition ? maxPosition.position + 1 : 1;
    }

    // Update board's total lists count
    const Board = mongoose.model('Board');
    await Board.findByIdAndUpdate(this.board, {
      $inc: { 'metadata.totalLists': 1 }
    });
  }
  next();
});

// Pre-remove middleware to clean up and update metadata
listSchema.pre('remove', async function(next) {
  // Remove all cards in this list
  const Card = mongoose.model('Card');
  const cards = await Card.find({ list: this._id });

  // Update project metadata
  const Project = mongoose.model('Project');
  await Project.findByIdAndUpdate(this.project, {
    $inc: { 'metadata.totalTasks': -cards.length }
  });

  // Remove all cards
  await Card.deleteMany({ list: this._id });

  // Update board's total lists count
  const Board = mongoose.model('Board');
  await Board.findByIdAndUpdate(this.board, {
    $inc: {
      'metadata.totalLists': -1,
      'metadata.totalCards': -cards.length
    }
  });

  next();
});

// Indexes for performance
listSchema.index({ board: 1, position: 1 });
listSchema.index({ project: 1, isArchived: 1 });
listSchema.index({ board: 1, isArchived: 1 });
listSchema.index({ createdBy: 1 });
listSchema.index({ listType: 1 });

// Compound index for efficient querying
listSchema.index({
  board: 1,
  isArchived: 1,
  position: 1
});

module.exports = mongoose.model('List', listSchema);