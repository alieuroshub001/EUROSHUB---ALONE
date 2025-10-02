const express = require('express');
const router = express.Router();

const Card = require('../models/Card');
const List = require('../models/List');
const User = require('../models/User');
const Activity = require('../models/Activity');
const automationService = require('../services/automationService');
const { protect } = require('../middleware/auth');
const {
  checkListAccess,
  checkCardAccess
} = require('../middleware/projectAuth');
const { upload, uploadImage, deleteFile } = require('../config/cloudinary');

/**
 * Helper function to log card activity with proper board ID
 */
async function logCardActivity(card, type, userId, metadata = {}) {
  const list = await List.findById(card.listId).select('boardId');

  return Activity.logActivity({
    type,
    user: userId,
    project: card.project || null,
    board: list ? list.boardId : null,
    list: card.listId,
    card: card._id,
    metadata: {
      entityName: card.title,
      entityId: card._id,
      ...metadata
    }
  });
}

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
      {
        path: 'assignedTo',
        select: 'firstName lastName avatar email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'watchers',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'completedBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'comments.author',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'timeTracking.entries.user',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'tasks.assignedTo',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      }
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
 * @route   PUT /api/cards/:cardId
 * @desc    Update card
 * @access  Private
 */
router.put('/:cardId', protect, checkCardAccess, async (req, res) => {
  try {
    let card = req.card;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      startDate,
      labels,
      customFields,
      checklist
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
      const oldStatus = card.status;
      changes.push({ field: 'status', oldValue: oldStatus, newValue: status });
      card.status = status;

      // Trigger automation for status change
      automationService.handleTaskStatusChange(
        card._id,
        oldStatus,
        status,
        req.user.id
      ).catch(error => {
        console.error('Automation error for status change:', error);
      });
    }

    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;

      // Validate due date against project dates if setting a new due date
      if (newDueDate) {
        const Project = require('../models/Project');
        const project = await Project.findById(card.project);

        if (!project) {
          return res.status(400).json({
            success: false,
            message: 'Associated project not found'
          });
        }

        // Check if due date is before project start date
        if (project.startDate && newDueDate < project.startDate) {
          return res.status(400).json({
            success: false,
            message: `Task due date cannot be before project start date (${project.startDate.toISOString().split('T')[0]})`
          });
        }

        // Check if due date is after project end date (if project has end date)
        if (project.endDate && newDueDate > project.endDate) {
          return res.status(400).json({
            success: false,
            message: `Task due date cannot be after project end date (${project.endDate.toISOString().split('T')[0]})`
          });
        }
      }

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

    if (checklist && JSON.stringify(checklist) !== JSON.stringify(card.checklist)) {
      try {
        console.log('Processing checklist update for card:', card._id);
        console.log('Checklist items received:', checklist.length);

        // Clean checklist data to handle frontend-backend data format differences
        const mongoose = require('mongoose');
        const cleanedChecklist = checklist.map((item, index) => {
          try {
            if (!item || typeof item !== 'object') {
              throw new Error(`Invalid checklist item at index ${index}: ${JSON.stringify(item)}`);
            }

            if (!item.text || typeof item.text !== 'string') {
              throw new Error(`Invalid text for checklist item at index ${index}: ${JSON.stringify(item.text)}`);
            }

            const cleanedItem = {
              text: item.text.trim(),
              completed: Boolean(item.completed),
              completedAt: item.completed && item.completedAt ? new Date(item.completedAt) : (item.completed ? new Date() : null),
              completedBy: null
            };

            // Handle completedBy field - ensure it's a valid ObjectId or null
            if (item.completedBy) {
              try {
                if (typeof item.completedBy === 'string' && item.completedBy.trim() !== '') {
                  // Validate ObjectId format
                  if (mongoose.Types.ObjectId.isValid(item.completedBy)) {
                    cleanedItem.completedBy = new mongoose.Types.ObjectId(item.completedBy);
                  } else {
                    console.warn(`Invalid ObjectId string for checklist item ${index}:`, item.completedBy);
                  }
                } else if (item.completedBy instanceof mongoose.Types.ObjectId) {
                  cleanedItem.completedBy = item.completedBy;
                } else if (typeof item.completedBy === 'object' && item.completedBy._id) {
                  // Handle case where completedBy is a populated user object
                  if (mongoose.Types.ObjectId.isValid(item.completedBy._id)) {
                    cleanedItem.completedBy = new mongoose.Types.ObjectId(item.completedBy._id);
                  }
                }
              } catch (completedByError) {
                console.warn(`Error processing completedBy for checklist item ${index}:`, completedByError.message);
                // Leave completedBy as null if conversion fails
              }
            }

            // Set completedBy to current user if marking as completed but no completedBy is set
            if (cleanedItem.completed && !cleanedItem.completedBy) {
              cleanedItem.completedBy = new mongoose.Types.ObjectId(req.user.id);
            }

            return cleanedItem;
          } catch (itemError) {
            console.error(`Error processing checklist item at index ${index}:`, itemError.message);
            console.error('Problematic item:', JSON.stringify(item));
            throw itemError;
          }
        });

        console.log('Successfully cleaned checklist items:', cleanedChecklist.length);

        changes.push({ field: 'checklist', oldValue: [...card.checklist], newValue: cleanedChecklist });
        card.checklist = cleanedChecklist;

        // Trigger automation for checklist changes
        setImmediate(() => {
          automationService.handleChecklistUpdate(
            card._id,
            req.user.id
          ).catch(error => {
            console.error('Automation error for checklist update:', error);
          });
        });

      } catch (checklistError) {
        console.error('Error processing checklist update:', checklistError.message);
        console.error('Original checklist data:', JSON.stringify(checklist));
        return res.status(400).json({
          success: false,
          message: `Error processing checklist: ${checklistError.message}`
        });
      }
    }

    // Handle version conflicts with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await card.save();
        break; // Success, exit retry loop
      } catch (error) {
        if (error.name === 'VersionError' && retries > 1) {
          console.log(`Version conflict detected, retrying... (${4 - retries}/3)`);
          // Refresh card data from database
          const freshCard = await Card.findById(card._id);
          if (freshCard) {
            // Re-apply the changes to the fresh card
            if (title && title !== freshCard.title) {
              freshCard.title = title;
            }
            if (description !== undefined && description !== freshCard.description) {
              freshCard.description = description;
            }
            if (priority && priority !== freshCard.priority) {
              freshCard.priority = priority;
            }
            if (status && status !== freshCard.status) {
              freshCard.status = status;
            }
            if (dueDate !== undefined) {
              const newDueDate = dueDate ? new Date(dueDate) : null;
              freshCard.dueDate = newDueDate;
            }
            if (startDate !== undefined) {
              const newStartDate = startDate ? new Date(startDate) : null;
              freshCard.startDate = newStartDate;
            }
            if (labels && JSON.stringify(labels) !== JSON.stringify(freshCard.labels)) {
              freshCard.labels = labels;
            }
            if (customFields && JSON.stringify(customFields) !== JSON.stringify(freshCard.customFields)) {
              freshCard.customFields = customFields;
            }
            if (checklist && JSON.stringify(checklist) !== JSON.stringify(freshCard.checklist)) {
              try {
                const mongoose = require('mongoose');
                const cleanedChecklist = checklist.map((item, index) => {
                  const cleanedItem = {
                    text: item.text ? item.text.trim() : '',
                    completed: Boolean(item.completed),
                    completedAt: item.completed && item.completedAt ? new Date(item.completedAt) : (item.completed ? new Date() : null),
                    completedBy: null
                  };

                  // Handle completedBy field - ensure it's a valid ObjectId or null
                  if (item.completedBy) {
                    try {
                      if (typeof item.completedBy === 'string' && item.completedBy.trim() !== '') {
                        // Validate ObjectId format
                        if (mongoose.Types.ObjectId.isValid(item.completedBy)) {
                          cleanedItem.completedBy = new mongoose.Types.ObjectId(item.completedBy);
                        }
                      } else if (item.completedBy instanceof mongoose.Types.ObjectId) {
                        cleanedItem.completedBy = item.completedBy;
                      } else if (typeof item.completedBy === 'object' && item.completedBy._id) {
                        // Handle case where completedBy is a populated user object
                        if (mongoose.Types.ObjectId.isValid(item.completedBy._id)) {
                          cleanedItem.completedBy = new mongoose.Types.ObjectId(item.completedBy._id);
                        }
                      }
                    } catch (error) {
                      console.warn('Invalid completedBy ObjectId in retry:', item.completedBy, error.message);
                      // Leave completedBy as null if conversion fails
                    }
                  }

                  // Set completedBy to current user if marking as completed but no completedBy is set
                  if (cleanedItem.completed && !cleanedItem.completedBy) {
                    cleanedItem.completedBy = new mongoose.Types.ObjectId(req.user.id);
                  }

                  return cleanedItem;
                });
                freshCard.checklist = cleanedChecklist;
              } catch (retryChecklistError) {
                console.error('Error processing checklist in retry:', retryChecklistError.message);
                // Skip checklist update in retry if there's an error
              }
            }
            card = freshCard; // Use the fresh card for next retry
          }
          retries--;
        } else {
          throw error; // Re-throw if it's not a version error or no retries left
        }
      }
    }

    // Log activity if there were changes
    if (changes.length > 0) {
      await Activity.logActivity({
        type: 'card_updated',
        user: req.user.id,
        project: card.project || null,
        board: null, // Fixed: card.board does not exist
        list: card.listId,
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
      {
        path: 'assignedTo',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      }
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
    const listId = card.listId;

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
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      data: {
        newValue: userIds
      },
      metadata: {
        entityName: card.title,
        entityId: card._id
      }
    });

    // Trigger automation for task assignment
    automationService.handleTaskAssignment(
      card._id,
      userIds,
      req.user.id
    ).catch(error => {
      console.error('Automation error for task assignment:', error);
    });

    // Populate for response
    await card.populate({
      path: 'assignedTo',
      select: 'firstName lastName avatar email',
      match: { _id: { $ne: null } }
    });

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
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
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
    await card.populate({
      path: 'assignedTo',
      select: 'firstName lastName avatar email',
      match: { _id: { $ne: null } }
    });

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
    await logCardActivity(card, 'card_comment_added', req.user.id);

    // Trigger automation for comment notification
    automationService.handleTaskComment(
      card._id,
      text,
      req.user.id
    ).catch(error => {
      console.error('Automation error for comment notification:', error);
    });

    // Populate for response
    await card.populate({
      path: 'comments.author',
      select: 'firstName lastName avatar',
      match: { _id: { $ne: null } }
    });

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
 * @route   GET /api/cards/:cardId/comments
 * @desc    Get all comments for a card
 * @access  Private
 */
router.get('/:cardId/comments', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;

    // Populate comments with author and reaction user details
    await card.populate([
      {
        path: 'comments.author',
        select: 'firstName lastName avatar email'
      },
      {
        path: 'comments.reactions.user',
        select: 'firstName lastName avatar'
      }
    ]);

    // Filter out deleted comments
    const activeComments = card.comments.filter(comment => !comment.isDeleted);

    res.status(200).json({
      success: true,
      data: activeComments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments'
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
      await card.populate({
      path: 'comments.author',
      select: 'firstName lastName avatar',
      match: { _id: { $ne: null } }
    });

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
 * @route   POST /api/cards/:cardId/comments/:commentId/reactions
 * @desc    Add reaction to comment
 * @access  Private
 */
router.post('/:cardId/comments/:commentId/reactions', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { commentId } = req.params;
    const { emoji } = req.body;

    const comment = card.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = comment.reactions?.find(
      r => r.user.toString() === req.user.id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      return res.status(400).json({
        success: false,
        message: 'You already reacted with this emoji'
      });
    }

    // Add reaction
    if (!comment.reactions) comment.reactions = [];
    comment.reactions.push({
      emoji,
      user: req.user.id
    });

    await card.save();

    // Populate reactions
    await card.populate({
      path: 'comments.reactions.user',
      select: 'firstName lastName avatar'
    });

    const updatedComment = card.comments.id(commentId);

    res.status(200).json({
      success: true,
      data: updatedComment.reactions,
      message: 'Reaction added successfully'
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reaction'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId/comments/:commentId/reactions/:emoji
 * @desc    Remove reaction from comment
 * @access  Private
 */
router.delete('/:cardId/comments/:commentId/reactions/:emoji', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { commentId, emoji } = req.params;

    const comment = card.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Find and remove the reaction
    const reactionIndex = comment.reactions?.findIndex(
      r => r.user.toString() === req.user.id.toString() && r.emoji === decodeURIComponent(emoji)
    );

    if (reactionIndex === -1 || reactionIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Reaction not found'
      });
    }

    comment.reactions.splice(reactionIndex, 1);
    await card.save();

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing reaction'
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
    await card.populate({
      path: 'timeTracking.entries.user',
      select: 'firstName lastName avatar',
      match: { _id: { $ne: null } }
    });

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

    const oldListId = card.listId;

    // Move card to new list
    await card.moveToList(targetListId, position);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_moved',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
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

    // Trigger automation for card movement and status updates
    automationService.handleCardMovedBetweenLists(
      card._id,
      oldListId,
      targetListId,
      req.user.id
    ).catch(error => {
      console.error('Automation error for card movement:', error);
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
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      })
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

/**
 * @route   POST /api/cards/:cardId/attachments
 * @desc    Upload file attachment to card
 * @access  Private
 */
router.post('/:cardId/attachments', protect, checkCardAccess, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const card = req.card;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if user has permission to add attachments
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add attachments to this card'
      });
    }

    // Add attachment to card
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: req.file.path,
      uploadedBy: req.user.id
    };

    card.attachments.push(attachment);
    await card.save();

    // Trigger notification for attachment added
    automationService.handleAttachmentAdded(
      card._id,
      req.file.originalname,
      req.user.id,
      'file'
    ).catch(error => {
      console.error('Automation error for attachment added:', error);
    });

    // Log activity
    await Activity.logActivity({
      type: 'card_attachment_added',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        attachmentName: req.file.originalname
      }
    });

    // Populate for response
    await card.populate({
      path: 'attachments.uploadedBy',
      select: 'firstName lastName avatar',
      match: { _id: { $ne: null } }
    });

    const newAttachment = card.attachments[card.attachments.length - 1];

    res.status(201).json({
      success: true,
      data: newAttachment,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/images
 * @desc    Upload image attachment to card
 * @access  Private
 */
router.post('/:cardId/images', protect, checkCardAccess, uploadImage.single('image'), async (req, res) => {
  try {
    const card = req.card;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    // Check if user has permission to add attachments
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add images to this card'
      });
    }

    // Add image attachment to card
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: req.file.path,
      uploadedBy: req.user.id
    };

    card.attachments.push(attachment);
    await card.save();

    // Trigger notification for image added
    automationService.handleAttachmentAdded(
      card._id,
      req.file.originalname,
      req.user.id,
      'image'
    ).catch(error => {
      console.error('Automation error for image added:', error);
    });

    // Log activity
    await Activity.logActivity({
      type: 'card_image_added',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        imageName: req.file.originalname
      }
    });

    // Populate for response
    await card.populate({
      path: 'attachments.uploadedBy',
      select: 'firstName lastName avatar',
      match: { _id: { $ne: null } }
    });

    const newAttachment = card.attachments[card.attachments.length - 1];

    res.status(201).json({
      success: true,
      data: newAttachment,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId/attachments/:attachmentId
 * @desc    Delete attachment from card
 * @access  Private
 */
router.delete('/:cardId/attachments/:attachmentId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { attachmentId } = req.params;

    // Check if user has permission to delete attachments
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete attachments from this card'
      });
    }

    // Find the attachment
    const attachment = card.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if user is the uploader or has admin role
    if (attachment.uploadedBy.toString() !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete attachments you uploaded'
      });
    }

    // Extract public_id from Cloudinary URL to delete from cloud
    try {
      const urlParts = attachment.url.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExtension.split('.')[0];
      await deleteFile(`euroshub/attachments/${publicId}`);
    } catch (cloudError) {
      console.warn('Failed to delete file from Cloudinary:', cloudError);
      // Continue with database deletion even if cloud deletion fails
    }

    // Remove attachment from card
    card.attachments.pull(attachmentId);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_attachment_deleted',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        attachmentName: attachment.originalName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attachment'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/attachments/multiple
 * @desc    Upload multiple file attachments to card
 * @access  Private
 */
router.post('/:cardId/attachments/multiple', protect, checkCardAccess, (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      console.error('Multiple file upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const card = req.card;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Check if user has permission to add attachments
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add attachments to this card'
      });
    }

    // Add all attachments to card
    const newAttachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: file.path,
      uploadedBy: req.user.id
    }));

    card.attachments.push(...newAttachments);
    await card.save();

    // Trigger notifications for each file
    for (const file of req.files) {
      automationService.handleAttachmentAdded(
        card._id,
        file.originalname,
        req.user.id,
        'file'
      ).catch(error => {
        console.error('Automation error for multiple attachment added:', error);
      });

      // Log activity for each file
      await Activity.logActivity({
        type: 'card_attachment_added',
        user: req.user.id,
        project: card.project || null,
        board: null, // Fixed: card.board does not exist
        list: card.listId,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id,
          attachmentName: file.originalname
        }
      });
    }

    // Populate for response
    await card.populate({
      path: 'attachments.uploadedBy',
      select: 'firstName lastName avatar',
      match: { _id: { $ne: null } }
    });

    const addedAttachments = card.attachments.slice(-req.files.length);

    res.status(201).json({
      success: true,
      data: addedAttachments,
      message: `${req.files.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Upload multiple attachments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files'
    });
  }
});

/**
 * @route   GET /api/cards/:cardId/attachments/:attachmentId/download
 * @desc    Download attachment with proper filename
 * @access  Private
 */
router.get('/:cardId/attachments/:attachmentId/download', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { attachmentId } = req.params;

    // Find the attachment
    const attachment = card.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if user has permission to download attachments
    const hasPermission = await card.hasPermission(req.user.id, 'read');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download attachments from this card'
      });
    }

    // Set headers for file download with original filename
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimetype);

    // Redirect to the Cloudinary URL
    res.redirect(attachment.url);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading attachment'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/checklist
 * @desc    Add checklist item to card
 * @access  Private
 */
router.post('/:cardId/checklist', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { text, completed = false } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Checklist item text is required'
      });
    }

    // Check if user has permission to add checklist items
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add checklist items to this card'
      });
    }

    // Add checklist item
    const checklistItem = {
      text: text.trim(),
      completed,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? req.user.id : null
    };

    card.checklist.push(checklistItem);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_checklist_item_added',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        checklistItem: text.trim()
      }
    });

    // Populate for response
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar' },
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'checklist.completedBy', select: 'firstName lastName avatar' }
    ]);

    res.status(201).json({
      success: true,
      data: card,
      message: 'Checklist item added successfully'
    });
  } catch (error) {
    console.error('Add checklist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding checklist item'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/checklist/bulk
 * @desc    Add multiple checklist items to card
 * @access  Private
 */
router.post('/:cardId/checklist/bulk', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    // Check if user has permission to add checklist items
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add checklist items to this card'
      });
    }

    // Validate and prepare checklist items
    const checklistItems = items.map(item => {
      if (!item.text || item.text.trim().length === 0) {
        throw new Error('All checklist items must have text');
      }

      return {
        text: item.text.trim(),
        completed: item.completed || false,
        completedAt: item.completed ? new Date() : null,
        completedBy: item.completed ? req.user.id : null
      };
    });

    // Add all checklist items
    card.checklist.push(...checklistItems);
    await card.save();

    // Trigger notification for subtasks added
    automationService.handleSubtasksAdded(
      card._id,
      checklistItems,
      req.user.id
    ).catch(error => {
      console.error('Automation error for subtasks added:', error);
    });

    // Log activity
    await Activity.logActivity({
      type: 'card_checklist_items_added',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        itemCount: items.length
      }
    });

    // Populate for response
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar' },
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'checklist.completedBy', select: 'firstName lastName avatar' }
    ]);

    res.status(201).json({
      success: true,
      data: card,
      message: `${items.length} checklist items added successfully`
    });
  } catch (error) {
    console.error('Add checklist items error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding checklist items'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/checklist/:itemId
 * @desc    Update checklist item
 * @access  Private
 */
router.put('/:cardId/checklist/:itemId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { itemId } = req.params;
    const { text, completed } = req.body;

    // Check if user has permission to update checklist items
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update checklist items on this card'
      });
    }

    // Find the checklist item
    const checklistItem = card.checklist.id(itemId);
    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    // Update the checklist item
    if (text !== undefined) {
      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Checklist item text cannot be empty'
        });
      }
      checklistItem.text = text.trim();
    }

    if (completed !== undefined) {
      checklistItem.completed = completed;
      if (completed) {
        checklistItem.completedAt = new Date();
        checklistItem.completedBy = req.user.id;
      } else {
        checklistItem.completedAt = null;
        checklistItem.completedBy = null;
      }
    }

    await card.save();

    // Trigger automation for checklist changes
    if (completed !== undefined) {
      automationService.handleChecklistUpdate(
        card._id,
        req.user.id
      ).catch(error => {
        console.error('Automation error for checklist update:', error);
      });
    }

    // Log activity
    await Activity.logActivity({
      type: 'card_checklist_item_updated',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        checklistItem: checklistItem.text
      }
    });

    // Populate for response
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar' },
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'checklist.completedBy', select: 'firstName lastName avatar' }
    ]);

    res.status(200).json({
      success: true,
      data: card,
      message: 'Checklist item updated successfully'
    });
  } catch (error) {
    console.error('Update checklist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating checklist item'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId/checklist/:itemId
 * @desc    Delete checklist item
 * @access  Private
 */
router.delete('/:cardId/checklist/:itemId', protect, checkCardAccess, async (req, res) => {
  try {
    const card = req.card;
    const { itemId } = req.params;

    // Check if user has permission to delete checklist items
    const hasPermission = await card.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete checklist items from this card'
      });
    }

    // Find the checklist item
    const checklistItem = card.checklist.id(itemId);
    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    const itemText = checklistItem.text;

    // Remove the checklist item
    card.checklist.pull(itemId);
    await card.save();

    // Log activity
    await Activity.logActivity({
      type: 'card_checklist_item_deleted',
      user: req.user.id,
      project: card.project || null,
      board: null, // Fixed: card.board does not exist
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        checklistItem: itemText
      }
    });

    // Populate for response
    await card.populate([
      { path: 'assignedTo', select: 'firstName lastName avatar' },
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'checklist.completedBy', select: 'firstName lastName avatar' }
    ]);

    res.status(200).json({
      success: true,
      data: card,
      message: 'Checklist item deleted successfully'
    });
  } catch (error) {
    console.error('Delete checklist item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting checklist item'
    });
  }
});

module.exports = router;
