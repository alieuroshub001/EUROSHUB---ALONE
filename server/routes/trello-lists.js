const express = require('express');
const router = express.Router();

const List = require('../models/List');
const Card = require('../models/Card');
const Board = require('../models/Board');
const { protect } = require('../middleware/auth');

// Middleware to get board and check access
const getBoardWithAccess = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    const hasAccess = await board.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this board'
      });
    }

    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking board access'
    });
  }
};

/**
 * @route   GET /api/boards/:boardId/lists
 * @desc    Get all lists in a board
 * @access  Private
 */
router.get('/:boardId/lists', protect, getBoardWithAccess, async (req, res) => {
  try {
    const lists = await List.find({
      boardId: req.params.boardId,
      isArchived: false
    })
    .populate('createdBy', 'firstName lastName avatar')
    .sort({ position: 1 });

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
 * @route   POST /api/boards/:boardId/lists
 * @desc    Create new list in board
 * @access  Private
 */
router.post('/:boardId/lists', protect, getBoardWithAccess, async (req, res) => {
  try {
    const { name, description, color, position } = req.body;

    // Check permission
    const hasPermission = await req.board.hasPermission(req.user.id, 'write');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create lists in this board'
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'List name is required'
      });
    }

    // Get next position if not provided
    let listPosition = position;
    if (typeof position !== 'number') {
      const maxPositionList = await List.findOne(
        { boardId: req.params.boardId },
        {},
        { sort: { position: -1 } }
      );
      listPosition = maxPositionList ? maxPositionList.position + 1 : 1;
    }

    const list = new List({
      name: name.trim(),
      description: description || '',
      boardId: req.params.boardId,
      createdBy: req.user.id,
      position: listPosition,
      color: color || '#6B7280'
    });

    await list.save();
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
router.put('/:listId', protect, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check access through board
    const hasAccess = await list.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this list'
      });
    }

    // Check permission
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this list'
      });
    }

    const { name, description, color, settings } = req.body;

    // Update fields
    if (name && name.trim()) list.name = name.trim();
    if (description !== undefined) list.description = description;
    if (color) list.color = color;
    if (settings !== undefined) list.settings = { ...list.settings, ...settings };

    await list.save();

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
router.delete('/:listId', protect, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permission
    const hasPermission = await list.hasPermission(req.user.id, 'delete');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this list'
      });
    }

    // Delete list (pre-remove middleware will handle cards cleanup)
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
 * @desc    Archive/Unarchive list
 * @access  Private
 */
router.put('/:listId/archive', protect, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permission
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this list'
      });
    }

    list.isArchived = !list.isArchived;
    await list.save();

    res.status(200).json({
      success: true,
      data: { isArchived: list.isArchived },
      message: `List ${list.isArchived ? 'archived' : 'unarchived'} successfully`
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
 * @route   PUT /api/lists/:listId/reorder
 * @desc    Reorder list position
 * @access  Private
 */
router.put('/:listId/reorder', protect, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permission
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder this list'
      });
    }

    const { position, listOrder } = req.body;

    // If listOrder is provided, update all list positions
    if (listOrder && Array.isArray(listOrder)) {
      const bulkOps = listOrder.map((item, index) => ({
        updateOne: {
          filter: { _id: item.listId, boardId: list.boardId },
          update: { position: index + 1 }
        }
      }));

      if (bulkOps.length > 0) {
        await List.bulkWrite(bulkOps);
      }
    } else if (typeof position === 'number') {
      // Fallback to single position update
      list.position = position;
      await list.save();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Position must be a number or listOrder must be provided'
      });
    }

    res.status(200).json({
      success: true,
      message: 'List position updated successfully'
    });
  } catch (error) {
    console.error('Reorder list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering list'
    });
  }
});

/**
 * @route   POST /api/lists/:listId/move-cards
 * @desc    Move all cards from this list to another list
 * @access  Private
 */
router.post('/:listId/move-cards', protect, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check permission
    const hasPermission = await list.hasPermission(req.user.id, 'write');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to move cards from this list'
      });
    }

    const { targetListId } = req.body;

    if (!targetListId) {
      return res.status(400).json({
        success: false,
        message: 'Target list ID is required'
      });
    }

    const movedCardsCount = await list.moveAllCardsTo(targetListId);

    res.status(200).json({
      success: true,
      data: { movedCardsCount },
      message: `${movedCardsCount} cards moved successfully`
    });
  } catch (error) {
    console.error('Move cards error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error moving cards'
    });
  }
});

module.exports = router;