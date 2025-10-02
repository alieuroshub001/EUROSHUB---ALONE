const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      // Project activities
      'project_created', 'project_updated', 'project_deleted', 'project_archived',
      'project_member_added', 'project_member_removed', 'project_member_role_changed',

      // Board activities
      'board_created', 'board_updated', 'board_deleted', 'board_archived',

      // List activities
      'list_created', 'list_updated', 'list_deleted', 'list_moved',

      // Card activities
      'card_created', 'card_updated', 'card_deleted', 'card_moved',
      'card_assigned', 'card_unassigned', 'card_completed', 'card_reopened',
      'card_due_date_set', 'card_due_date_changed', 'card_comment_added',
      'card_comment_edited', 'card_comment_deleted', 'card_comment_reacted',
      'card_attachment_added', 'card_attachment_removed', 'card_attachment_deleted',
      'card_image_added', 'card_label_added', 'card_label_removed',
      'card_checklist_item_completed', 'card_checklist_items_added',
      'card_file_uploaded', 'card_file_deleted', 'card_folder_created', 'card_folder_deleted',
      'card_task_added', 'card_task_completed', 'card_task_deleted',
      'card_member_added', 'card_member_removed', 'card_description_changed'
    ],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false,
    default: null
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
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  data: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    field: String,
    comment: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  metadata: {
    entityName: String,
    entityId: mongoose.Schema.Types.ObjectId,
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for activity description
activitySchema.virtual('description').get(function() {
  const descriptions = {
    'project_created': 'created project',
    'project_updated': 'updated project',
    'project_deleted': 'deleted project',
    'project_archived': 'archived project',
    'project_member_added': 'added member to project',
    'project_member_removed': 'removed member from project',
    'project_member_role_changed': 'changed member role in project',

    'board_created': 'created board',
    'board_updated': 'updated board',
    'board_deleted': 'deleted board',
    'board_archived': 'archived board',

    'list_created': 'created list',
    'list_updated': 'updated list',
    'list_deleted': 'deleted list',
    'list_moved': 'moved list',

    'card_created': 'created card',
    'card_updated': 'updated card',
    'card_deleted': 'deleted card',
    'card_moved': 'moved card',
    'card_assigned': 'assigned card',
    'card_unassigned': 'unassigned card',
    'card_completed': 'completed card',
    'card_reopened': 'reopened card',
    'card_due_date_set': 'set due date for card',
    'card_due_date_changed': 'changed due date for card',
    'card_comment_added': 'added comment to card',
    'card_comment_edited': 'edited a comment',
    'card_comment_deleted': 'deleted a comment',
    'card_comment_reacted': 'reacted to a comment',
    'card_attachment_added': 'added attachment to card',
    'card_attachment_removed': 'removed attachment from card',
    'card_label_added': 'added label to card',
    'card_label_removed': 'removed label from card',
    'card_checklist_item_completed': 'completed checklist item',
    'card_checklist_items_added': 'added checklist items to card',
    'card_file_uploaded': 'uploaded a file',
    'card_file_deleted': 'deleted a file',
    'card_folder_created': 'created a folder',
    'card_folder_deleted': 'deleted a folder',
    'card_task_added': 'added a task',
    'card_task_completed': 'completed a task',
    'card_task_deleted': 'deleted a task',
    'card_member_added': 'added a member',
    'card_member_removed': 'removed a member',
    'card_description_changed': 'changed the description'
  };

  return descriptions[this.type] || 'performed action';
});

// Static method to create activity log
activitySchema.statics.logActivity = async function(activityData) {
  try {
    console.log('Creating activity with data:', activityData); // Debug log
    const activity = new this(activityData);
    await activity.save();

    // Populate for real-time notifications
    await activity.populate([
      { path: 'user', select: 'firstName lastName avatar' },
      { path: 'project', select: 'title' },
      { path: 'board', select: 'title' },
      { path: 'list', select: 'title' },
      { path: 'card', select: 'title' },
      { path: 'targetUser', select: 'firstName lastName' }
    ]);

    // Emit socket event for real-time updates
    try {
      const app = require('../server');
      const socketManager = app.get('socketManager');

      if (socketManager && activity.card) {
        socketManager.notifyCard(activity.card._id || activity.card, 'activity-created', activity);
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
      // Don't fail the activity creation if socket emission fails
    }

    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

// Static method to get project activities
activitySchema.statics.getProjectActivities = async function(projectId, userId, userRole, options = {}) {
  const { limit = 50, skip = 0, types = [], startDate, endDate } = options;

  // Build query
  let query = { project: projectId };

  // Add type filter if provided
  if (types && types.length > 0) {
    query.type = { $in: types };
  }

  // Add date range if provided
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Check if user has access to project
  const Project = mongoose.model('Project');
  const project = await Project.findById(projectId);

  if (!project) {
    throw new Error('Project not found');
  }

  // Check access permissions
  if (!['superadmin', 'admin'].includes(userRole)) {
    // Check if user is project owner or member
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(m => m.user.toString() === userId.toString());

    if (!isOwner && !isMember) {
      throw new Error('Access denied');
    }
  }

  return this.find(query)
    .populate([
      { path: 'user', select: 'firstName lastName avatar' },
      { path: 'board', select: 'title' },
      { path: 'list', select: 'title' },
      { path: 'card', select: 'title' },
      { path: 'targetUser', select: 'firstName lastName' }
    ])
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get user activities
activitySchema.statics.getUserActivities = async function(userId, options = {}) {
  const { limit = 50, skip = 0, types = [], projectId } = options;

  let query = { user: userId };

  if (types && types.length > 0) {
    query.type = { $in: types };
  }

  if (projectId) {
    query.project = projectId;
  }

  return this.find(query)
    .populate([
      { path: 'project', select: 'title' },
      { path: 'board', select: 'title' },
      { path: 'list', select: 'title' },
      { path: 'card', select: 'title' },
      { path: 'targetUser', select: 'firstName lastName' }
    ])
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get activities for dashboard
activitySchema.statics.getDashboardActivities = async function(userId, userRole, options = {}) {
  const { limit = 20, skip = 0 } = options;

  let query = {};

  if (['superadmin', 'admin'].includes(userRole)) {
    // Superadmin and admin can see all activities
    query = {};
  } else {
    // Other users can only see activities from their projects
    const Project = mongoose.model('Project');
    const userProjects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);
    query.project = { $in: projectIds };
  }

  const activities = await this.find(query)
    .populate([
      { path: 'user', select: 'firstName lastName avatar' },
      { path: 'project', select: 'title' },
      { path: 'board', select: 'title' },
      { path: 'list', select: 'title' },
      { path: 'card', select: 'title' }
    ])
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  // Debug log to check project population
  activities.forEach(activity => {
    if (!activity.project) {
      console.log('Activity with missing project:', activity._id, activity.type, activity.project);
    }
  });

  return activities;
};

// Indexes for performance
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ card: 1, createdAt: -1 });
activitySchema.index({ board: 1, createdAt: -1 });

// Compound indexes
activitySchema.index({
  project: 1,
  type: 1,
  createdAt: -1
});

activitySchema.index({
  user: 1,
  project: 1,
  createdAt: -1
});

module.exports = mongoose.model('Activity', activitySchema);