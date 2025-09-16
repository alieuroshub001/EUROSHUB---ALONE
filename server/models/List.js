const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'List name is required'],
    trim: true,
    maxlength: [100, 'List name cannot be more than 100 characters']
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board is required']
  },
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  position: {
    type: Number,
    required: true,
    default: 0
  },
  color: {
    type: String,
    default: null,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date
  },
  settings: {
    cardLimit: {
      type: Number,
      default: null,
      min: [1, 'Card limit must be at least 1']
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    autoSort: {
      enabled: {
        type: Boolean,
        default: false
      },
      criteria: {
        type: String,
        enum: ['dueDate', 'priority', 'alphabetical', 'createdAt'],
        default: 'createdAt'
      },
      direction: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'asc'
      }
    }
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

listSchema.virtual('cardCount').get(function() {
  return this.cards ? this.cards.length : 0;
});

listSchema.virtual('isCardLimitReached').get(function() {
  if (!this.settings.cardLimit) return false;
  return this.cardCount >= this.settings.cardLimit;
});

listSchema.virtual('completedCardCount').get(async function() {
  const Card = mongoose.model('Card');
  const completedCards = await Card.countDocuments({
    _id: { $in: this.cards },
    isCompleted: true
  });
  return completedCards;
});

listSchema.methods.addCard = function(cardId, position = null) {
  if (this.settings.isLocked) {
    throw new Error('List is locked and cannot accept new cards');
  }

  if (this.isCardLimitReached) {
    throw new Error('Card limit reached for this list');
  }

  if (position !== null && position >= 0 && position < this.cards.length) {
    this.cards.splice(position, 0, cardId);
  } else {
    this.cards.push(cardId);
  }

  return this.save();
};

listSchema.methods.removeCard = function(cardId) {
  this.cards = this.cards.filter(card => card.toString() !== cardId.toString());
  return this.save();
};

listSchema.methods.moveCard = function(cardId, newPosition) {
  const currentIndex = this.cards.findIndex(card => card.toString() === cardId.toString());

  if (currentIndex === -1) {
    throw new Error('Card not found in this list');
  }

  // Remove card from current position
  const [card] = this.cards.splice(currentIndex, 1);

  // Insert at new position
  this.cards.splice(newPosition, 0, card);

  return this.save();
};

listSchema.methods.sortCards = async function() {
  if (!this.settings.autoSort.enabled) {
    return this;
  }

  const Card = mongoose.model('Card');
  const cards = await Card.find({ _id: { $in: this.cards } });

  let sortedCards;
  const { criteria, direction } = this.settings.autoSort;

  switch (criteria) {
    case 'dueDate':
      sortedCards = cards.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return direction === 'asc' ?
          new Date(a.dueDate) - new Date(b.dueDate) :
          new Date(b.dueDate) - new Date(a.dueDate);
      });
      break;
    case 'priority':
      const priorityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'urgent': 4 };
      sortedCards = cards.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        return direction === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      });
      break;
    case 'alphabetical':
      sortedCards = cards.sort((a, b) => {
        return direction === 'asc' ?
          a.title.localeCompare(b.title) :
          b.title.localeCompare(a.title);
      });
      break;
    case 'createdAt':
    default:
      sortedCards = cards.sort((a, b) => {
        return direction === 'asc' ?
          new Date(a.createdAt) - new Date(b.createdAt) :
          new Date(b.createdAt) - new Date(a.createdAt);
      });
      break;
  }

  this.cards = sortedCards.map(card => card._id);
  return this.save();
};

listSchema.methods.canUserAccess = async function(user) {
  const Board = mongoose.model('Board');
  const board = await Board.findById(this.board);

  if (!board) return false;

  return board.canUserAccess(user);
};

listSchema.pre('save', function(next) {
  if (this.isModified('isArchived') && this.isArchived) {
    this.archivedAt = new Date();
  }
  next();
});

listSchema.index({ board: 1, position: 1 });
listSchema.index({ board: 1, isArchived: 1 });
listSchema.index({ createdBy: 1 });

module.exports = mongoose.model('List', listSchema);