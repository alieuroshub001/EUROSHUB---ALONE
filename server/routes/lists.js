const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const List = require('../models/List');
const Board = require('../models/Board');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const { protect: auth } = require('../middleware/auth');

// Get lists for a board
router.get('/', auth, async (req, res) => {
  try {
    const { boardId } = req.query;

    if (!boardId) {
      return res.status(400).json({
        success: false,
        message: 'Board ID is required'
      });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check access permissions
    if (!await board.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const lists = await List.find({ board: boardId, isArchived: false })
      .populate({
        path: 'cards',
        populate: [
          { path: 'assignedMembers', select: 'firstName lastName avatar' },
          { path: 'labels', select: 'name color' }
        ],
        options: { sort: { position: 1 } }
      })
      .sort({ position: 1 });

    res.status(200).json({
      success: true,
      data: { lists }
    });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lists'
    });
  }
});

// Get single list by ID
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid list ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const list = await List.findById(req.params.id)
      .populate('board', 'name project')
      .populate({
        path: 'cards',
        populate: [
          { path: 'assignedMembers', select: 'firstName lastName avatar' },
          { path: 'labels', select: 'name color' }
        ],
        options: { sort: { position: 1 } }
      })
      .populate('createdBy', 'firstName lastName avatar');

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check access permissions
    if (!await list.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: { list }
    });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve list'
    });
  }
});

// Create new list
router.post('/', auth, [
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('List name must be between 1 and 100 characters'),
  body('board').isMongoId().withMessage('Invalid board ID'),
  body('position').optional().isInt({ min: 0 }).withMessage('Position must be a non-negative integer'),
  body('color').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid color format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if board exists and user has access
    const board = await Board.findById(req.body.board).populate('project');
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    if (!await board.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get position for new list
    let position = req.body.position;
    if (position === undefined) {
      const lastList = await List.findOne({ board: req.body.board }).sort({ position: -1 });
      position = lastList ? lastList.position + 1 : 0;
    }

    const list = new List({
      name: req.body.name,
      board: req.body.board,
      position,
      color: req.body.color,
      createdBy: req.user._id,
      cards: []
    });

    await list.save();

    // Add list to board
    board.lists.push(list._id);
    await board.save();

    // Create activity log
    await Activity.createActivity(
      'list_created',
      req.user._id,
      { project: board.project._id, board: board._id, list: list._id },
      {
        newValue: list.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await list.populate('board', 'name');

    res.status(201).json({
      success: true,
      message: 'List created successfully',
      data: { list }
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create list'
    });
  }
});

// Update list
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid list ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('List name must be between 1 and 100 characters'),
  body('color').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid color format'),
  body('settings.cardLimit').optional().isInt({ min: 1 }).withMessage('Card limit must be at least 1'),
  body('settings.isLocked').optional().isBoolean().withMessage('isLocked must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const list = await List.findById(req.params.id).populate({
      path: 'board',
      populate: { path: 'project' }
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permissions
    if (!await list.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const oldName = list.name;
    const updatedList = await List.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('board', 'name');

    // Create activity log if name changed
    if (req.body.name && req.body.name !== oldName) {
      await Activity.createActivity(
        'list_renamed',
        req.user._id,
        {
          project: list.board.project._id,
          board: list.board._id,
          list: list._id
        },
        {
          oldValue: oldName,
          newValue: req.body.name,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'List updated successfully',
      data: { list: updatedList }
    });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update list'
    });
  }
});

// Move list to new position
router.patch('/:id/move', auth, [
  param('id').isMongoId().withMessage('Invalid list ID'),
  body('position').isInt({ min: 0 }).withMessage('Position must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const list = await List.findById(req.params.id).populate({
      path: 'board',
      populate: { path: 'project' }
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permissions
    if (!await list.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const newPosition = req.body.position;
    const currentPosition = list.position;

    if (newPosition === currentPosition) {
      return res.status(200).json({
        success: true,
        message: 'List position unchanged',
        data: { list }
      });
    }

    // Update positions of other lists
    if (newPosition > currentPosition) {
      // Moving right - decrease position of lists between current and new position
      await List.updateMany(
        {
          board: list.board._id,
          position: { $gt: currentPosition, $lte: newPosition },
          _id: { $ne: list._id }
        },
        { $inc: { position: -1 } }
      );
    } else {
      // Moving left - increase position of lists between new and current position
      await List.updateMany(
        {
          board: list.board._id,
          position: { $gte: newPosition, $lt: currentPosition },
          _id: { $ne: list._id }
        },
        { $inc: { position: 1 } }
      );
    }

    // Update the moved list's position
    list.position = newPosition;
    await list.save();

    // Create activity log
    await Activity.createActivity(
      'list_moved',
      req.user._id,
      {
        project: list.board.project._id,
        board: list.board._id,
        list: list._id
      },
      {
        position: newPosition,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(200).json({
      success: true,
      message: 'List moved successfully',
      data: { list }
    });
  } catch (error) {
    console.error('Move list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move list'
    });
  }
});

// Sort cards in list
router.patch('/:id/sort', auth, [
  param('id').isMongoId().withMessage('Invalid list ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const list = await List.findById(req.params.id);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permissions
    if (!await list.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await list.sortCards();

    const updatedList = await List.findById(req.params.id)
      .populate({
        path: 'cards',
        populate: [
          { path: 'assignedMembers', select: 'firstName lastName avatar' },
          { path: 'labels', select: 'name color' }
        ]
      });

    res.status(200).json({
      success: true,
      message: 'Cards sorted successfully',
      data: { list: updatedList }
    });
  } catch (error) {
    console.error('Sort cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sort cards'
    });
  }
});

// Archive list
router.patch('/:id/archive', auth, [
  param('id').isMongoId().withMessage('Invalid list ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const list = await List.findById(req.params.id).populate({
      path: 'board',
      populate: { path: 'project' }
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permissions
    if (!await list.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    list.isArchived = true;
    list.archivedAt = new Date();
    await list.save();

    // Archive all cards in the list
    await Card.updateMany(
      { list: list._id },
      { isArchived: true, archivedAt: new Date() }
    );

    // Remove list from board
    await Board.findByIdAndUpdate(
      list.board._id,
      { $pull: { lists: list._id } }
    );

    // Create activity log
    await Activity.createActivity(
      'list_archived',
      req.user._id,
      {
        project: list.board.project._id,
        board: list.board._id,
        list: list._id
      },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(200).json({
      success: true,
      message: 'List archived successfully'
    });
  } catch (error) {
    console.error('Archive list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive list'
    });
  }
});

// Copy list
router.post('/:id/copy', auth, [
  param('id').isMongoId().withMessage('Invalid list ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('List name must be between 1 and 100 characters'),
  body('board').optional().isMongoId().withMessage('Invalid board ID'),
  body('includeCards').optional().isBoolean().withMessage('includeCards must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const originalList = await List.findById(req.params.id).populate('cards');

    if (!originalList) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permissions for original list
    if (!await originalList.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const targetBoardId = req.body.board || originalList.board;
    const targetBoard = await Board.findById(targetBoardId).populate('project');

    if (!targetBoard) {
      return res.status(404).json({
        success: false,
        message: 'Target board not found'
      });
    }

    // Check permissions for target board
    if (!await targetBoard.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to target board'
      });
    }

    // Get position for new list
    const lastList = await List.findOne({ board: targetBoardId }).sort({ position: -1 });
    const position = lastList ? lastList.position + 1 : 0;

    // Create new list
    const newListData = {
      name: req.body.name || `${originalList.name} (Copy)`,
      board: targetBoardId,
      position,
      color: originalList.color,
      settings: originalList.settings,
      createdBy: req.user._id,
      cards: []
    };

    const newList = new List(newListData);
    await newList.save();

    // Add list to board
    targetBoard.lists.push(newList._id);
    await targetBoard.save();

    // Copy cards if requested
    if (req.body.includeCards && originalList.cards.length > 0) {
      for (let i = 0; i < originalList.cards.length; i++) {
        const originalCard = await Card.findById(originalList.cards[i]);
        if (originalCard) {
          const newCard = new Card({
            title: originalCard.title,
            description: originalCard.description,
            list: newList._id,
            position: i,
            priority: originalCard.priority,
            estimatedHours: originalCard.estimatedHours,
            createdBy: req.user._id
          });

          await newCard.save();
          newList.cards.push(newCard._id);
        }
      }
      await newList.save();
    }

    // Create activity log
    await Activity.createActivity(
      'list_created',
      req.user._id,
      {
        project: targetBoard.project._id,
        board: targetBoard._id,
        list: newList._id
      },
      {
        newValue: newList.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await newList.populate('board', 'name');
    await newList.populate('cards');

    res.status(201).json({
      success: true,
      message: 'List copied successfully',
      data: { list: newList }
    });
  } catch (error) {
    console.error('Copy list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy list'
    });
  }
});

module.exports = router;