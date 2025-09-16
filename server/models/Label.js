const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Label name is required'],
    trim: true,
    maxlength: [50, 'Label name cannot be more than 50 characters']
  },
  color: {
    type: String,
    required: [true, 'Label color is required'],
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color']
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Board is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Label description cannot be more than 200 characters']
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

labelSchema.virtual('cardCount').get(async function() {
  const Card = mongoose.model('Card');
  return await Card.countDocuments({ labels: this._id });
});

labelSchema.methods.canUserAccess = async function(user) {
  const Board = mongoose.model('Board');
  const board = await Board.findById(this.board);

  if (!board) return false;

  return board.canUserAccess(user);
};

labelSchema.pre('save', function(next) {
  if (this.isModified('isArchived') && this.isArchived) {
    this.archivedAt = new Date();
  }
  next();
});

labelSchema.index({ board: 1, name: 1 });
labelSchema.index({ board: 1, isArchived: 1 });
labelSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Label', labelSchema);