const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      'card_created',
      'card_moved',
      'card_archived',
      'card_restored',
      'card_deleted',
      'card_completed',
      'card_reopened',
      'card_assigned',
      'card_unassigned',
      'card_due_date_set',
      'card_due_date_removed',
      'card_due_date_changed',
      'card_due_date_completed',
      'card_description_changed',
      'card_title_changed',
      'card_priority_changed',
      'card_label_added',
      'card_label_removed',
      'card_attachment_added',
      'card_attachment_removed',
      'card_comment_added',
      'card_comment_edited',
      'card_comment_deleted',
      'card_checklist_added',
      'card_checklist_removed',
      'card_checklist_item_completed',
      'card_checklist_item_uncompleted',
      'card_cover_changed',
      'card_cover_removed',
      'list_created',
      'list_renamed',
      'list_moved',
      'list_archived',
      'list_restored',
      'list_deleted',
      'board_created',
      'board_renamed',
      'board_description_changed',
      'board_archived',
      'board_restored',
      'board_deleted',
      'board_member_added',
      'board_member_removed',
      'board_label_created',
      'board_label_updated',
      'board_label_deleted',
      'project_created',
      'project_updated',
      'project_archived',
      'project_restored',
      'project_deleted',
      'project_member_added',
      'project_member_removed',
      'project_status_changed'
    ]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board'
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List'
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  data: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    fieldName: String,
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fromList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List'
    },
    toList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List'
    },
    position: Number,
    attachmentName: String,
    checklistName: String,
    checklistItemText: String,
    labelName: String,
    labelColor: String
  },
  description: {
    type: String,
    maxlength: [500, 'Activity description cannot be more than 500 characters']
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

activitySchema.virtual('formattedMessage').get(function() {
  const messages = {
    'card_created': 'created this card',
    'card_moved': `moved this card from ${this.data.fromList?.name || 'another list'} to ${this.data.toList?.name || 'this list'}`,
    'card_archived': 'archived this card',
    'card_restored': 'restored this card from archive',
    'card_deleted': 'deleted this card',
    'card_completed': 'marked this card as complete',
    'card_reopened': 'reopened this card',
    'card_assigned': `assigned ${this.data.targetUser?.fullName || 'someone'} to this card`,
    'card_unassigned': `removed ${this.data.targetUser?.fullName || 'someone'} from this card`,
    'card_due_date_set': `set due date to ${this.data.newValue}`,
    'card_due_date_removed': 'removed the due date',
    'card_due_date_changed': `changed due date from ${this.data.oldValue} to ${this.data.newValue}`,
    'card_due_date_completed': 'marked the due date complete',
    'card_description_changed': 'changed the description of this card',
    'card_title_changed': `changed the title from "${this.data.oldValue}" to "${this.data.newValue}"`,
    'card_priority_changed': `changed priority from ${this.data.oldValue} to ${this.data.newValue}`,
    'card_label_added': `added label "${this.data.labelName}" to this card`,
    'card_label_removed': `removed label "${this.data.labelName}" from this card`,
    'card_attachment_added': `added attachment "${this.data.attachmentName}" to this card`,
    'card_attachment_removed': `removed attachment "${this.data.attachmentName}" from this card`,
    'card_comment_added': 'added a comment to this card',
    'card_comment_edited': 'edited a comment on this card',
    'card_comment_deleted': 'deleted a comment on this card',
    'card_checklist_added': `added checklist "${this.data.checklistName}" to this card`,
    'card_checklist_removed': `removed checklist "${this.data.checklistName}" from this card`,
    'card_checklist_item_completed': `completed "${this.data.checklistItemText}" on this card`,
    'card_checklist_item_uncompleted': `marked "${this.data.checklistItemText}" as incomplete on this card`,
    'card_cover_changed': 'changed the cover of this card',
    'card_cover_removed': 'removed the cover from this card',
    'list_created': `added list "${this.data.newValue}" to this board`,
    'list_renamed': `renamed list from "${this.data.oldValue}" to "${this.data.newValue}"`,
    'list_moved': 'moved this list',
    'list_archived': 'archived this list',
    'list_restored': 'restored this list from archive',
    'list_deleted': 'deleted this list',
    'board_created': `created board "${this.data.newValue}"`,
    'board_renamed': `renamed board from "${this.data.oldValue}" to "${this.data.newValue}"`,
    'board_description_changed': 'changed the description of this board',
    'board_archived': 'archived this board',
    'board_restored': 'restored this board from archive',
    'board_deleted': 'deleted this board',
    'board_member_added': `added ${this.data.targetUser?.fullName || 'someone'} to this board`,
    'board_member_removed': `removed ${this.data.targetUser?.fullName || 'someone'} from this board`,
    'board_label_created': `created label "${this.data.labelName}"`,
    'board_label_updated': `updated label "${this.data.labelName}"`,
    'board_label_deleted': `deleted label "${this.data.labelName}"`,
    'project_created': `created project "${this.data.newValue}"`,
    'project_updated': 'updated this project',
    'project_archived': 'archived this project',
    'project_restored': 'restored this project from archive',
    'project_deleted': 'deleted this project',
    'project_member_added': `added ${this.data.targetUser?.fullName || 'someone'} to this project`,
    'project_member_removed': `removed ${this.data.targetUser?.fullName || 'someone'} from this project`,
    'project_status_changed': `changed project status from ${this.data.oldValue} to ${this.data.newValue}`
  };

  return messages[this.type] || 'performed an action';
});

activitySchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
});

activitySchema.statics.createActivity = function(type, user, entities, data = {}) {
  const activity = {
    type,
    user,
    data,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent
  };

  // Set entity references
  if (entities.project) activity.project = entities.project;
  if (entities.board) activity.board = entities.board;
  if (entities.list) activity.list = entities.list;
  if (entities.card) activity.card = entities.card;
  if (entities.comment) activity.comment = entities.comment;

  return this.create(activity);
};

activitySchema.statics.getProjectActivity = function(projectId, limit = 50, page = 1) {
  const skip = (page - 1) * limit;

  return this.find({ project: projectId })
    .populate('user', 'firstName lastName avatar')
    .populate('board', 'name')
    .populate('list', 'name')
    .populate('card', 'title')
    .populate('comment', 'text')
    .populate('data.targetUser', 'firstName lastName')
    .populate('data.fromList', 'name')
    .populate('data.toList', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

activitySchema.statics.getBoardActivity = function(boardId, limit = 50, page = 1) {
  const skip = (page - 1) * limit;

  return this.find({ board: boardId })
    .populate('user', 'firstName lastName avatar')
    .populate('list', 'name')
    .populate('card', 'title')
    .populate('comment', 'text')
    .populate('data.targetUser', 'firstName lastName')
    .populate('data.fromList', 'name')
    .populate('data.toList', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

activitySchema.statics.getCardActivity = function(cardId, limit = 50, page = 1) {
  const skip = (page - 1) * limit;

  return this.find({ card: cardId })
    .populate('user', 'firstName lastName avatar')
    .populate('comment', 'text')
    .populate('data.targetUser', 'firstName lastName')
    .populate('data.fromList', 'name')
    .populate('data.toList', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ card: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1 });

module.exports = mongoose.model('Activity', activitySchema);