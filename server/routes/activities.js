const express = require('express');
const router = express.Router();

const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/activities/dashboard
 * @desc    Get dashboard activities for current user
 * @access  Private
 */
router.get('/dashboard', protect, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const activities = await Activity.getDashboardActivities(
      req.user.id,
      req.user.role,
      {
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    );

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get dashboard activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard activities'
    });
  }
});

/**
 * @route   GET /api/activities/user/:userId
 * @desc    Get user activities
 * @access  Private
 */
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0, types = [], projectId } = req.query;

    // Only allow users to view their own activities unless they're admin/superadmin
    if (userId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own activities'
      });
    }

    const activities = await Activity.getUserActivities(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      types: types.length > 0 ? types.split(',') : [],
      projectId: projectId || null
    });

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get user activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activities'
    });
  }
});

/**
 * @route   GET /api/activities/my-activities
 * @desc    Get current user's activities
 * @access  Private
 */
router.get('/my-activities', protect, async (req, res) => {
  try {
    const { limit = 50, skip = 0, types = [], projectId } = req.query;

    const activities = await Activity.getUserActivities(req.user.id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      types: types.length > 0 ? types.split(',') : [],
      projectId: projectId || null
    });

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get my activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your activities'
    });
  }
});

/**
 * @route   GET /api/activities/types
 * @desc    Get available activity types
 * @access  Private
 */
router.get('/types', protect, async (req, res) => {
  try {
    const activityTypes = [
      // Project activities
      { type: 'project_created', label: 'Project Created' },
      { type: 'project_updated', label: 'Project Updated' },
      { type: 'project_deleted', label: 'Project Deleted' },
      { type: 'project_archived', label: 'Project Archived' },
      { type: 'project_member_added', label: 'Project Member Added' },
      { type: 'project_member_removed', label: 'Project Member Removed' },
      { type: 'project_member_role_changed', label: 'Project Member Role Changed' },

      // Board activities
      { type: 'board_created', label: 'Board Created' },
      { type: 'board_updated', label: 'Board Updated' },
      { type: 'board_deleted', label: 'Board Deleted' },
      { type: 'board_archived', label: 'Board Archived' },

      // List activities
      { type: 'list_created', label: 'List Created' },
      { type: 'list_updated', label: 'List Updated' },
      { type: 'list_deleted', label: 'List Deleted' },
      { type: 'list_moved', label: 'List Moved' },

      // Card activities
      { type: 'card_created', label: 'Card Created' },
      { type: 'card_updated', label: 'Card Updated' },
      { type: 'card_deleted', label: 'Card Deleted' },
      { type: 'card_moved', label: 'Card Moved' },
      { type: 'card_assigned', label: 'Card Assigned' },
      { type: 'card_unassigned', label: 'Card Unassigned' },
      { type: 'card_completed', label: 'Card Completed' },
      { type: 'card_reopened', label: 'Card Reopened' },
      { type: 'card_due_date_set', label: 'Card Due Date Set' },
      { type: 'card_due_date_changed', label: 'Card Due Date Changed' },
      { type: 'card_comment_added', label: 'Card Comment Added' },
      { type: 'card_attachment_added', label: 'Card Attachment Added' },
      { type: 'card_attachment_removed', label: 'Card Attachment Removed' },
      { type: 'card_label_added', label: 'Card Label Added' },
      { type: 'card_label_removed', label: 'Card Label Removed' },
      { type: 'card_checklist_item_completed', label: 'Card Checklist Item Completed' }
    ];

    res.status(200).json({
      success: true,
      data: activityTypes
    });
  } catch (error) {
    console.error('Get activity types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity types'
    });
  }
});

/**
 * @route   GET /api/activities/card/:cardId
 * @desc    Get activities for a specific card
 * @access  Private
 */
router.get('/card/:cardId', protect, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Get card to check access permissions
    const Card = require('../models/Card');
    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check if user has access to this card
    const hasPermission = await card.hasPermission(req.user.id, 'read');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this card'
      });
    }

    // Get all activities related to this card
    const activities = await Activity.find({ card: cardId })
      .populate([
        { path: 'user', select: 'firstName lastName avatar' },
        { path: 'targetUser', select: 'firstName lastName avatar' }
      ])
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get card activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching card activities'
    });
  }
});

/**
 * @route   GET /api/activities/stats
 * @desc    Get activity statistics for current user
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const { period = 'week' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { createdAt: { $gte: monthAgo } };
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { createdAt: { $gte: yearAgo } };
        break;
    }

    let matchCondition = { user: req.user.id, ...dateFilter };

    // If not admin/superadmin, limit to user's accessible projects
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      const Project = require('../models/Project');
      const userProjects = await Project.find({
        $or: [
          { owner: req.user.id },
          { 'members.user': req.user.id }
        ]
      }).select('_id');

      const projectIds = userProjects.map(p => p._id);
      matchCondition.project = { $in: projectIds };
    }

    const stats = await Activity.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalActivities = stats.reduce((sum, stat) => sum + stat.count, 0);

    // Get daily activity counts for the period
    const dailyStats = await Activity.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalActivities,
        byType: stats,
        daily: dailyStats,
        period
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity statistics'
    });
  }
});

module.exports = router;