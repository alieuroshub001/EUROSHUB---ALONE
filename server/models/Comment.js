const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot be more than 1000 characters']
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: [true, 'Card is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
    }
  }],
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

commentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

commentSchema.virtual('totalReactions').get(function() {
  if (!this.reactions || this.reactions.length === 0) return 0;
  return this.reactions.reduce((sum, reaction) => sum + reaction.users.length, 0);
});

commentSchema.virtual('isThreadStarter').get(function() {
  return !this.parentComment;
});

commentSchema.methods.addReaction = function(emoji, userId) {
  let reaction = this.reactions.find(r => r.emoji === emoji);

  if (!reaction) {
    reaction = { emoji, users: [] };
    this.reactions.push(reaction);
  }

  const userIndex = reaction.users.indexOf(userId);
  if (userIndex === -1) {
    reaction.users.push(userId);
  } else {
    // Remove reaction if already exists (toggle behavior)
    reaction.users.splice(userIndex, 1);
    if (reaction.users.length === 0) {
      this.reactions = this.reactions.filter(r => r.emoji !== emoji);
    }
  }

  return this.save();
};

commentSchema.methods.addReply = function(replyId) {
  this.replies.push(replyId);
  return this.save();
};

commentSchema.methods.removeReply = function(replyId) {
  this.replies = this.replies.filter(reply => reply.toString() !== replyId.toString());
  return this.save();
};

commentSchema.methods.mentionUser = function(userId) {
  if (!this.mentions.includes(userId)) {
    this.mentions.push(userId);
  }
  return this.save();
};

commentSchema.methods.extractMentions = function() {
  const mentionRegex = /@(\w+)/g;
  const matches = this.text.match(mentionRegex);
  return matches ? matches.map(match => match.substring(1)) : [];
};

commentSchema.methods.markAsEdited = function() {
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

commentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.text = '[This comment has been deleted]';
  return this.save();
};

commentSchema.methods.canUserEdit = function(userId) {
  return this.author.toString() === userId.toString();
};

commentSchema.methods.canUserDelete = function(user) {
  if (user.role === 'superadmin' || user.role === 'admin') {
    return true;
  }

  return this.author.toString() === user._id.toString();
};

commentSchema.pre('save', function(next) {
  if (this.isModified('text') && !this.isNew) {
    this.markAsEdited();
  }
  next();
});

commentSchema.index({ card: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ mentions: 1 });
commentSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Comment', commentSchema);