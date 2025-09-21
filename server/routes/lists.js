const express = require('express');
const router = express.Router();

const List = require('../models/List');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const automationService = require('../services/automationService');
const { protect } = require('../middleware/auth');
const {
  checkBoardAccess,
  checkListAccess
} = require('../middleware/projectAuth');

/**
 * @route   GET /api/boards/:boardId/lists
 * @desc    Get board lists
 * @access  Private
 */
router.get('/boards/:boardId/lists', protect, checkBoardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { includeArchived = false, includeCards = true } = req.query;

    let query = { board: boardId };
    if (!includeArchived || includeArchived === 'false') {
      query.isArchived = false;
    }

    const listsQuery = List.find(query)
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ position: 1 });

    if (includeCards === 'true') {
      listsQuery.populate({
        path: 'cards',
        match: { isArchived: false },
        options: { sort: { position: 1 } },
        populate: [
          { path: 'assignedTo', select: 'firstName lastName avatar' },
          { path: 'createdBy', select: 'firstName lastName avatar' }
        ]
      });
    }

    const lists = await listsQuery;

    res.status(200).json({
      success: true,
      data: lists
    });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lists'
    });
  }
});

/**
 * @route   GET /api/lists/:listId
 * @desc    Get list details
 * @access  Private
 */
router.get('/:listId', protect, checkListAccess, async (req, res) => {
  try {
    const list = req.list;

    // Populate list with cards
    await list.populate([
      { path: 'createdBy', select: 'firstName lastName avatar' },
      {
        path: 'cards',
        match: { isArchived: false },
        options: { sort: { position: 1 } },
        populate: [
          { path: 'assignedTo', select: 'firstName lastName avatar' },
          { path: 'createdBy', select: 'firstName lastName avatar' }
        ]
      }
    ]);

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching list'
    });
  }
});

/**
 * @route   POST /api/boards/:boardId/lists
 * @desc    Create new list
 * @access  Private
 */
router.post('/boards/:boardId/lists', protect, checkBoardAccess, async (req, res) => {
  try {
    const { boardId } = req.params;
    const board = req.board;
    const {
      title,
      description,
      color,
      listType,
      position,
      settings
    } = req.body;

    // Check if user has permission to create lists
    const hasPermission = await board.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create lists in this board'
      });
    }

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'List title is required'
      });
    }

    // Create list
    const list = new List({
      title,
      description: description || '',
      board: boardId,
      project: board.project,
      createdBy: req.user.id,
      color: color || '#6B7280',
      listType: listType || 'custom',
      position: position || 0,
      settings: settings || {}
    });

    await list.save();

    // Log activity
    await Activity.logActivity({
      type: 'list_created',
      user: req.user.id,
      project: board.project,
      board: boardId,
      list: list._id,
      metadata: {
        entityName: list.title,
        entityId: list._id
      }
    });

    // Populate for response
    await list.populate('createdBy', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      data: list,
      message: 'List created successfully'
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating list'
    });
  }
});

/**
 * @route   PUT /api/lists/:listId
 * @desc    Update list
 * @access  Private
 */
router.put('/:listId', protect, checkListAccess, async (req, res) => {
  try {
    const list = req.list;
    const {
      title,
      description,
      color,
      settings
    } = req.body;

    // Check if user has permission to update list
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this list'
      });
    }

    // Track changes for activity log
    const changes = [];

    if (title && title !== list.title) {
      changes.push({ field: 'title', oldValue: list.title, newValue: title });
      list.title = title;
    }

    if (description !== undefined && description !== list.description) {
      changes.push({ field: 'description', oldValue: list.description, newValue: description });
      list.description = description;
    }

    if (color && color !== list.color) {
      changes.push({ field: 'color', oldValue: list.color, newValue: color });
      list.color = color;
    }

    if (settings) {
      const oldSettings = JSON.stringify(list.settings);
      const newSettings = JSON.stringify({ ...list.settings, ...settings });
      if (oldSettings !== newSettings) {
        changes.push({ field: 'settings', oldValue: list.settings, newValue: { ...list.settings, ...settings } });
        list.settings = { ...list.settings, ...settings };
      }
    }

    await list.save();

    // Log activity if there were changes
    if (changes.length > 0) {
      await Activity.logActivity({
        type: 'list_updated',
        user: req.user.id,
        project: list.project,
        board: list.board,
        list: list._id,
        metadata: {
          entityName: list.title,
          entityId: list._id,
          changes
        }
      });
    }

    res.status(200).json({
      success: true,
      data: list,
      message: 'List updated successfully'
    });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating list'
    });
  }
});

/**
 * @route   DELETE /api/lists/:listId
 * @desc    Delete list
 * @access  Private
 */
router.delete('/:listId', protect, checkListAccess, async (req, res) => {
  try {
    const list = req.list;

    // Check if user has permission to delete list
    const hasPermission = await list.hasPermission(req.user.id, 'delete');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this list'
      });
    }

    const listTitle = list.title;
    const projectId = list.project;
    const boardId = list.board;

    // Log activity before deletion
    await Activity.logActivity({
      type: 'list_deleted',
      user: req.user.id,
      project: projectId,
      board: boardId,
      list: list._id,
      metadata: {
        entityName: listTitle,
        entityId: list._id
      }
    });

    // Delete list (this will trigger pre-remove middleware to clean up cards)
    await list.deleteOne();

    res.status(200).json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting list'
    });
  }
});

/**
 * @route   PUT /api/lists/:listId/archive
 * @desc    Archive/unarchive list
 * @access  Private
 */
router.put('/:listId/archive', protect, checkListAccess, async (req, res) => {
  try {
    const list = req.list;
    const { archive = true } = req.body;

    // Check if user has permission to archive list
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this list'
      });
    }

    list.isArchived = archive;
    await list.save();

    // Log activity
    await Activity.logActivity({
      type: 'list_archived',
      user: req.user.id,
      project: list.project,
      board: list.board,
      list: list._id,
      data: {
        newValue: archive
      },
      metadata: {
        entityName: list.title,
        entityId: list._id
      }
    });

    res.status(200).json({
      success: true,
      data: list,
      message: `List ${archive ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    console.error('Archive list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving list'
    });
  }
});

/**
 * @route   PUT /api/lists/reorder
 * @desc    Reorder lists within a board
 * @access  Private
 */
router.put('/reorder', protect, async (req, res) => {
  try {
    const { listPositions } = req.body;

    if (!listPositions || !Array.isArray(listPositions)) {
      return res.status(400).json({
        success: false,
        message: 'List positions array is required'
      });
    }

    // Validate and update list positions
    const bulkOps = [];
    for (const { listId, position } of listPositions) {
      // Check if user has access to the list
      const list = await List.findById(listId).populate({
        path: 'board',
        populate: { path: 'project' }
      });

      if (!list) continue;

      const hasAccess = await list.hasAccess(req.user.id, req.user.role);
      if (!hasAccess) continue;

      bulkOps.push({
        updateOne: {
          filter: { _id: listId },
          update: { position: position }
        }
      });
    }

    if (bulkOps.length > 0) {
      await List.bulkWrite(bulkOps);

      // Log activity for first list (representing the reorder action)
      if (listPositions.length > 0) {
        const firstList = await List.findById(listPositions[0].listId);
        if (firstList) {
          await Activity.logActivity({
            type: 'list_moved',
            user: req.user.id,
            project: firstList.project,
            board: firstList.board,
            metadata: {
              entityName: 'Lists reordered',
              additionalInfo: { listsCount: bulkOps.length }
            }
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'List positions updated successfully'
    });
  } catch (error) {
    console.error('Reorder lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering lists'
    });
  }
});

/**
 * @route   POST /api/lists/:listId/duplicate
 * @desc    Duplicate list
 * @access  Private
 */
router.post('/:listId/duplicate', protect, checkListAccess, async (req, res) => {
  try {
    const originalList = req.list;
    const { title, includeCards = false } = req.body;

    // Check if user has permission to create lists
    const hasPermission = await originalList.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to duplicate this list'
      });
    }

    // Create new list
    const newList = new List({
      title: title || `${originalList.title} (Copy)`,
      description: originalList.description,
      board: originalList.board,
      project: originalList.project,
      createdBy: req.user.id,
      color: originalList.color,
      listType: originalList.listType,
      settings: originalList.settings
    });

    await newList.save();

    // Duplicate cards if requested
    if (includeCards) {
      const originalCards = await Card.find({ list: originalList._id }).sort({ position: 1 });

      for (const originalCard of originalCards) {
        const newCard = new Card({
          title: originalCard.title,
          description: originalCard.description,
          list: newList._id,
          board: originalList.board,
          project: originalList.project,
          createdBy: req.user.id,
          position: originalCard.position,
          priority: originalCard.priority,
          labels: [...originalCard.labels],
          customFields: [...originalCard.customFields]
        });

        await newCard.save();
      }
    }

    // Log activity
    await Activity.logActivity({
      type: 'list_created',
      user: req.user.id,
      project: originalList.project,
      board: originalList.board,
      list: newList._id,
      data: {
        comment: `Duplicated from "${originalList.title}"`
      },
      metadata: {
        entityName: newList.title,
        entityId: newList._id
      }
    });

    // Populate for response
    await newList.populate([
      { path: 'createdBy', select: 'firstName lastName avatar' },
      {
        path: 'cards',
        match: { isArchived: false },
        options: { sort: { position: 1 } }
      }
    ]);

    res.status(201).json({
      success: true,
      data: newList,
      message: 'List duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating list'
    });
  }
});

/**
 * @route   POST /api/lists/:listId/move-all-cards
 * @desc    Move all cards from one list to another
 * @access  Private
 */
router.post('/:listId/move-all-cards', protect, checkListAccess, async (req, res) => {
  try {
    const sourceList = req.list;
    const { targetListId } = req.body;

    if (!targetListId) {
      return res.status(400).json({
        success: false,
        message: 'Target list ID is required'
      });
    }

    // Check if user has permission to move cards
    const hasPermission = await sourceList.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to move cards from this list'
      });
    }

    // Verify target list exists and user has access
    const targetList = await List.findById(targetListId).populate({
      path: 'board',
      populate: { path: 'project' }
    });

    if (!targetList) {
      return res.status(404).json({
        success: false,
        message: 'Target list not found'
      });
    }

    const hasTargetAccess = await targetList.hasAccess(req.user.id, req.user.role);
    if (!hasTargetAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to the target list'
      });
    }

    // Move all cards
    const movedCount = await sourceList.moveAllCardsTo(targetListId);

    // Log activity
    if (movedCount > 0) {
      await Activity.logActivity({
        type: 'card_moved',
        user: req.user.id,
        project: sourceList.project,
        board: sourceList.board,
        list: sourceList._id,
        data: {
          comment: `Moved ${movedCount} cards to "${targetList.title}"`
        },
        metadata: {
          entityName: `${movedCount} cards moved`,
          additionalInfo: {
            sourceList: sourceList.title,
            targetList: targetList.title,
            cardCount: movedCount
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `${movedCount} cards moved successfully`,
      data: { movedCount }
    });
  } catch (error) {
    console.error('Move all cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error moving cards'
    });
  }
});

/**
 * @route   PUT /api/lists/:listId/cards/reorder
 * @desc    Reorder cards within a list
 * @access  Private
 */
router.put('/:listId/cards/reorder', protect, checkListAccess, async (req, res) => {
  try {
    const list = req.list;
    const { cardPositions } = req.body;

    if (!cardPositions || !Array.isArray(cardPositions)) {
      return res.status(400).json({
        success: false,
        message: 'Card positions array is required'
      });
    }

    // Check if user has permission to reorder cards
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder cards in this list'
      });
    }

    // Reorder cards
    await list.reorderCards(cardPositions);

    res.status(200).json({
      success: true,
      message: 'Cards reordered successfully'
    });
  } catch (error) {
    console.error('Reorder cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering cards'
    });
  }
});

/**
 * @route   GET /api/lists/:listId/cards
 * @desc    Get list cards
 * @access  Private
 */
router.get('/:listId/cards', protect, checkListAccess, async (req, res) => {
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
 * @route   POST /api/lists/:listId/cards
 * @desc    Create new card
 * @access  Private
 */
router.post('/:listId/cards', protect, checkListAccess, async (req, res) => {
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
      const User = require('../models/User');
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

    // Trigger automation for new task creation
    automationService.handleNewTaskCreation(
      card._id,
      req.user.id
    ).catch(error => {
      console.error('Automation error for new task creation:', error);
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

module.exports = router;