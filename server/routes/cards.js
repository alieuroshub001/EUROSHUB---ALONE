const express = require('express');
const router = express.Router();

const Card = require('../models/Card');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');
const {
  checkListAccess,
  checkCardAccess
} = require('../middleware/projectAuth');

/**
 * @route   GET /api/lists/:listId/cards
 * @desc    Get list cards
 * @access  Private
 */
router.get('/lists/:listId/cards', protect, checkListAccess, async (req, res) => {
  try {
    const { listId } = req.params;
    const { includeArchived = false, assignedTo, priority, status } = req.query;

    let query = { list: listId };
    if (!includeArchived || includeArchived === 'false') {
      query.isArchived = false;
    }

    // Add filters
    if (assignedTo) query.assignedTo = assignedTo;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    const cards = await Card.find(query)
      .populate('assignedTo', 'firstName lastName avatar email')
      .populate('createdBy', 'firstName lastName avatar')
      .populate('watchers', 'firstName lastName avatar')
      .populate('comments.author', 'firstName lastName avatar')
      .sort({ position: 1 });

    res.status(200).json({
      success: true,
      data: cards
    });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cards'
    });
  }
});

/**
 * @route   GET /api/cards/:cardId
 * @desc    Get card details
 * @access  Private
 */
router.get('/:cardId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;

    // Populate card details
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar email' },
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'watchers', select: 'firstName lastName avatar' },
      { path: 'completedBy', select: 'firstName lastName avatar' },
      { path: 'comments.author', select: 'firstName lastName avatar' },
      { path: 'timeTracking.entries.user', select: 'firstName lastName avatar' }
    ]);

    res.status(200).json({
      success: true,
      data: card
    });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching card'
    });
  }
});

/**
 * @route   POST /api/lists/:listId/cards
 * @desc    Create new card
 * @access  Private
 */
router.post('/lists/:listId/cards', protect, checkListAccess, async (req, res) => {
  try {
    const { listId } = req.params;
    const list = req.list;
    const {
      title,
      description,
      assignedTo,
      priority,
      dueDate,
      startDate,
      labels,
      position,
      customFields
    } = req.body;

    // Check if user has permission to create cards
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create cards in this list'
      });
    }

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Card title is required'
      });
    }

    // Validate assigned users if provided
    if (assignedTo && assignedTo.length > 0) {
      const users = await User.find({ _id: { $in: assignedTo } });
      if (users.length !== assignedTo.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned users not found'
        });
      }
    }

    // Create card
    const card = new Card({
      title,
      description: description || '',
      list: listId,
      board: list.board,
      project: list.project,
      createdBy: req.user.id,
      assignedTo: assignedTo || [],
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      labels: labels || [],
      position: position || 0,
      customFields: customFields || []
    });

    await card.save();

    // Assign users and add watchers
    if (assignedTo && assignedTo.length > 0) {
      card.assignUsers(assignedTo, req.user.id);
      await card.save();
    }

    // Log activity
    await Activity.logActivity({
      type: 'card_created',
      user: req.user.id,
      project: list.project,
      board: list.board,
      list: listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id
      }
    });

    // Populate for response
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar' },
      { path: 'createdBy', select: 'firstName lastName avatar' }
    ]);

    res.status(201).json({
      success: true,
      data: card,
      message: 'Card created successfully'
    });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating card'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId
 * @desc    Update card
 * @access  Private
 */
router.put('/:cardId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      startDate,
      labels,
      customFields
    } = req.body;

    // Check if user has permission to update card
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this card'
      });
    }

    // Track changes for activity log
    const changes = [];

    if (title && title !== card.title) {
      changes.push({ field: 'title', oldValue: card.title, newValue: title });
      card.title = title;
    }

    if (description !== undefined && description !== card.description) {
      changes.push({ field: 'description', oldValue: card.description, newValue: description });
      card.description = description;
    }

    if (priority && priority !== card.priority) {
      changes.push({ field: 'priority', oldValue: card.priority, newValue: priority });
      card.priority = priority;
    }

    if (status && status !== card.status) {
      changes.push({ field: 'status', oldValue: card.status, newValue: status });
      card.status = status;
    }

    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;
      if ((newDueDate && !card.dueDate) || (!newDueDate && card.dueDate) ||
          (newDueDate && card.dueDate && newDueDate.getTime() !== card.dueDate.getTime())) {
        changes.push({ field: 'dueDate', oldValue: card.dueDate, newValue: newDueDate });
        card.dueDate = newDueDate;
      }
    }

    if (startDate !== undefined) {
      const newStartDate = startDate ? new Date(startDate) : null;
      if ((newStartDate && !card.startDate) || (!newStartDate && card.startDate) ||
          (newStartDate && card.startDate && newStartDate.getTime() !== card.startDate.getTime())) {
        changes.push({ field: 'startDate', oldValue: card.startDate, newValue: newStartDate });
        card.startDate = newStartDate;
      }
    }

    if (labels && JSON.stringify(labels) !== JSON.stringify(card.labels)) {
      changes.push({ field: 'labels', oldValue: [...card.labels], newValue: labels });
      card.labels = labels;
    }

    if (customFields && JSON.stringify(customFields) !== JSON.stringify(card.customFields)) {
      changes.push({ field: 'customFields', oldValue: [...card.customFields], newValue: customFields });
      card.customFields = customFields;
    }

    await card.save();

    // Log activity if there were changes
    if (changes.length > 0) {
      await Activity.logActivity({
        type: 'card_updated',
        user: req.user.id,
        project: card.project,
        board: card.board,
        list: card.list,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id,
          changes
        }
      });
    }

    // Populate for response
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar' },
      { path: 'createdBy', select: 'firstName lastName avatar' }
    ]);

    res.status(200).json({
      success: true,
      data: card,
      message: 'Card updated successfully'
    });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating card'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId
 * @desc    Delete card
 * @access  Private
 */
router.delete('/:cardId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;

    // Check if user has permission to delete card
    const hasPermission = await card.hasPermission(req.user.id, 'delete');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this card'
      });
    }

    const cardTitle = card.title;
    const projectId = card.project;
    const boardId = card.board;
    const listId = card.list;

    // Log activity before deletion
    await Activity.logActivity({
      type: 'card_deleted',
      user: req.user.id,
      project: projectId,
      board: boardId,
      list: listId,
      card: card._id,
      metadata: {
        entityName: cardTitle,
        entityId: card._id
      }
    });

    // Delete card (this will trigger pre-remove middleware to update metadata)
    await card.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting card'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/assign
 * @desc    Assign users to card
 * @access  Private
 */
router.put('/:cardId/assign', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    // Check if user has permission to assign cards
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign this card'
      });
    }

    // Validate users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more users not found'
      });
    }

    // Assign users
    card.assignUsers(userIds, req.user.id);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_assigned',
      user: req.user.id,
      project: card.project,
      board: card.board,
      list: card.list,
      card: card._id,
      data: {
        newValue: userIds
      },
      metadata: {
        entityName: card.title,
        entityId: card._id
      }
    });

    // Populate for response
    await card.populate('assignedTo', 'firstName lastName avatar email');

    res.status(200).json({
      success: true,
      data: card.assignedTo,
      message: 'Users assigned successfully'
    });
  } catch (error) {
    console.error('Assign card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning users to card'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/unassign
 * @desc    Unassign users from card
 * @access  Private
 */
router.put('/:cardId/unassign', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    // Check if user has permission to unassign cards
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to unassign this card'
      });
    }

    // Unassign users
    card.unassignUsers(userIds);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_unassigned',
      user: req.user.id,
      project: card.project,
      board: card.board,
      list: card.list,
      card: card._id,
      data: {
        oldValue: userIds
      },
      metadata: {
        entityName: card.title,
        entityId: card._id
      }
    });

    // Populate for response
    await card.populate('assignedTo', 'firstName lastName avatar email');

    res.status(200).json({
      success: true,
      data: card.assignedTo,
      message: 'Users unassigned successfully'
    });
  } catch (error) {
    console.error('Unassign card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unassigning users from card'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/comments
 * @desc    Add comment to card
 * @access  Private
 */
router.post('/:cardId/comments', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { text, mentions = [] } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    // Check if user has permission to comment
    const hasPermission = await card.hasPermission(req.user.id, 'read');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to comment on this card'
      });
    }

    // Add comment
    card.addComment(text, req.user.id, mentions);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_comment_added',
      user: req.user.id,
      project: card.project,
      board: card.board,
      list: card.list,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id
      }
    });

    // Populate for response
    await card.populate('comments.author', 'firstName lastName avatar');

    const newComment = card.comments[card.comments.length - 1];

    res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/comments/:commentId
 * @desc    Update comment
 * @access  Private
 */
router.put('/:cardId/comments/:commentId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    try {
      card.updateComment(commentId, text, req.user.id);
      await card.save();

      // Populate for response
      await card.populate('comments.author', 'firstName lastName avatar');

      const updatedComment = card.comments.id(commentId);

      res.status(200).json({
        success: true,
        data: updatedComment,
        message: 'Comment updated successfully'
      });
    } catch (updateError) {
      return res.status(403).json({
        success: false,
        message: updateError.message
      });
    }
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId/comments/:commentId
 * @desc    Delete comment
 * @access  Private
 */
router.delete('/:cardId/comments/:commentId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { commentId } = req.params;

    try {
      card.deleteComment(commentId, req.user.id, req.user.role);
      await card.save();

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (deleteError) {
      return res.status(403).json({
        success: false,
        message: deleteError.message
      });
    }
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/time
 * @desc    Add time entry to card
 * @access  Private
 */
router.post('/:cardId/time', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { hours, description = '' } = req.body;

    if (!hours || hours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid hours amount is required'
      });
    }

    // Check if user has permission to log time
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to log time on this card'
      });
    }

    // Add time entry
    card.addTimeEntry(req.user.id, hours, description);
    await card.save();

    // Populate for response
    await card.populate('timeTracking.entries.user', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      data: card.timeTracking,
      message: 'Time logged successfully'
    });
  } catch (error) {
    console.error('Add time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging time'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/move
 * @desc    Move card to different list
 * @access  Private
 */
router.put('/:cardId/move', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { targetListId, position } = req.body;

    if (!targetListId) {
      return res.status(400).json({
        success: false,
        message: 'Target list ID is required'
      });
    }

    // Check if user has permission to move card
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to move this card'
      });
    }

    const oldListId = card.list;

    // Move card to new list
    await card.moveToList(targetListId, position);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_moved',
      user: req.user.id,
      project: card.project,
      board: card.board,
      list: targetListId,
      card: card._id,
      data: {
        oldValue: oldListId,
        newValue: targetListId
      },
      metadata: {
        entityName: card.title,
        entityId: card._id
      }
    });

    res.status(200).json({
      success: true,
      data: card,
      message: 'Card moved successfully'
    });
  } catch (error) {
    console.error('Move card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error moving card'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/archive
 * @desc    Archive/unarchive card
 * @access  Private
 */
router.put('/:cardId/archive', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { archive = true } = req.body;

    // Check if user has permission to archive card
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this card'
      });
    }

    card.isArchived = archive;
    if (archive) {
      card.archivedAt = new Date();
      card.archivedBy = req.user.id;
    } else {
      card.archivedAt = null;
      card.archivedBy = null;
    }

    await card.save();

    res.status(200).json({
      success: true,
      data: card,
      message: `Card ${archive ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    console.error('Archive card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving card'
    });
  }
});

/**
 * @route   GET /api/cards/assigned-to-me
 * @desc    Get cards assigned to current user
 * @access  Private
 */
router.get('/assigned-to-me', protect, async (req, res) => {
  try {
    const { status, priority, dueDate, page = 1, limit = 20 } = req.query;

    let query = {
      assignedTo: req.user.id,
      isArchived: false
    };

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (dueDate) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      switch (dueDate) {
        case 'overdue':
          query.dueDate = { $lt: today };
          break;
        case 'today':
          query.dueDate = {
            $gte: today,
            $lt: tomorrow
          };
          break;
        case 'this_week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          query.dueDate = {
            $gte: today,
            $lte: weekEnd
          };
          break;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const cards = await Card.find(query)
      .populate('assignedTo', 'firstName lastName avatar')
      .populate('createdBy', 'firstName lastName avatar')
      .populate('list', 'title')
      .populate('board', 'title')
      .populate('project', 'title')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    // Get total count
    const total = await Card.countDocuments(query);

    res.status(200).json({
      success: true,
      data: cards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get assigned cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned cards'
    });
  }
});

module.exports = router;