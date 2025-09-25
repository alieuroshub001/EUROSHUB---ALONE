const express = require('express');
const router = express.Router();

const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
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
 * @route   GET /api/boards
 * @desc    Get user's accessible boards
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const boards = await Board.getAccessibleBoards(req.user.id, req.user.role);

    // Transform boards for frontend
    const transformedBoards = boards.map(board => {
      const boardObj = board.toObject();

      // Add starred status for current user
      boardObj.isStarred = boardObj.starredBy?.includes(req.user.id) || false;

      // Add counts
      boardObj.listsCount = boardObj.metadata?.totalLists || 0;
      boardObj.cardsCount = boardObj.metadata?.totalCards || 0;

      // Clean up fields
      delete boardObj.starredBy;

      return boardObj;
    });

    res.status(200).json({
      success: true,
      data: transformedBoards
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching boards'
    });
  }
});

/**
 * @route   POST /api/boards
 * @desc    Create new board
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      name,
      description,
      background,
      visibility,
      createDefaultLists = true
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Board name is required'
      });
    }

    // Create board
    const board = new Board({
      name: name.trim(),
      description: description || '',
      background: background || '#6366f1',
      visibility: visibility || 'private',
      createdBy: req.user.id
    });

    await board.save();

    // Create default lists if requested
    if (createDefaultLists) {
      const defaultLists = [
        { name: 'To Do', position: 1 },
        { name: 'In Progress', position: 2 },
        { name: 'Done', position: 3 }
      ];

      for (const listData of defaultLists) {
        const list = new List({
          name: listData.name,
          boardId: board._id,
          createdBy: req.user.id,
          position: listData.position
        });
        await list.save();
      }

      // Update board metadata
      board.metadata.totalLists = defaultLists.length;
      await board.save();
    }

    // Populate for response
    await board.populate('createdBy', 'firstName lastName avatar');

    const boardObj = board.toObject();
    boardObj.isStarred = false;
    boardObj.listsCount = board.metadata?.totalLists || 0;
    boardObj.cardsCount = board.metadata?.totalCards || 0;

    res.status(201).json({
      success: true,
      data: boardObj,
      message: 'Board created successfully'
    });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating board'
    });
  }
});

/**
 * @route   GET /api/boards/:boardId
 * @desc    Get board details with lists and cards
 * @access  Private
 */
router.get('/:boardId', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;

    // Get lists with cards
    const lists = await List.find({ boardId: board._id, isArchived: false })
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ position: 1 });

    const listsWithCards = await Promise.all(
      lists.map(async (list) => {
        const cards = await Card.find({ listId: list._id, isArchived: false })
          .populate('createdBy', 'firstName lastName avatar')
          .populate('members.userId', 'firstName lastName avatar')
          .sort({ position: 1 });

        const listObj = list.toObject();
        listObj.cards = cards;
        return listObj;
      })
    );

    // Populate board details
    await board.populate([
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'members.userId', select: 'firstName lastName avatar' }
    ]);

    const boardObj = board.toObject();
    boardObj.lists = listsWithCards;
    boardObj.isStarred = boardObj.starredBy?.includes(req.user.id) || false;

    // Clean up
    delete boardObj.starredBy;

    res.status(200).json({
      success: true,
      data: boardObj
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching board'
    });
  }
});

/**
 * @route   PUT /api/boards/:boardId
 * @desc    Update board
 * @access  Private
 */
router.put('/:boardId', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;
    const { name, description, background, visibility } = req.body;

    // Check permission
    const hasPermission = await board.hasPermission(req.user.id, 'write');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this board'
      });
    }

    // Update fields
    if (name && name.trim()) board.name = name.trim();
    if (description !== undefined) board.description = description;
    if (background) board.background = background;
    if (visibility) board.visibility = visibility;

    await board.save();

    const boardObj = board.toObject();
    boardObj.isStarred = boardObj.starredBy?.includes(req.user.id) || false;
    delete boardObj.starredBy;

    res.status(200).json({
      success: true,
      data: boardObj,
      message: 'Board updated successfully'
    });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating board'
    });
  }
});

/**
 * @route   DELETE /api/boards/:boardId
 * @desc    Delete board
 * @access  Private
 */
router.delete('/:boardId', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;

    // Check permission
    const hasPermission = await board.hasPermission(req.user.id, 'delete');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this board'
      });
    }

    // Delete board (cascade will handle lists and cards)
    await board.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting board'
    });
  }
});

/**
 * @route   POST /api/boards/:boardId/star
 * @desc    Toggle board star/favorite
 * @access  Private
 */
router.post('/:boardId/star', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;
    await board.toggleStar(req.user.id);

    const isStarred = board.starredBy.includes(req.user.id);

    res.status(200).json({
      success: true,
      data: { isStarred },
      message: `Board ${isStarred ? 'starred' : 'unstarred'} successfully`
    });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling board star'
    });
  }
});

/**
 * @route   POST /api/boards/:boardId/members
 * @desc    Add member to board
 * @access  Private
 */
router.post('/:boardId/members', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;
    const { userId, role = 'member' } = req.body;

    // Check permission
    const hasPermission = await board.hasPermission(req.user.id, 'manage_members');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage board members'
      });
    }

    await board.addMember(userId, role);

    res.status(200).json({
      success: true,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding member'
    });
  }
});

/**
 * @route   DELETE /api/boards/:boardId/members/:userId
 * @desc    Remove member from board
 * @access  Private
 */
router.delete('/:boardId/members/:userId', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;
    const { userId } = req.params;

    // Check permission
    const hasPermission = await board.hasPermission(req.user.id, 'manage_members');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage board members'
      });
    }

    await board.removeMember(userId);

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member'
    });
  }
});

/**
 * @route   PUT /api/boards/:boardId/reorder
 * @desc    Reorder board position
 * @access  Private
 */
router.put('/:boardId/reorder', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;
    const { position } = req.body;

    if (typeof position !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Position must be a number'
      });
    }

    board.position = position;
    await board.save();

    res.status(200).json({
      success: true,
      message: 'Board position updated successfully'
    });
  } catch (error) {
    console.error('Reorder board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering board'
    });
  }
});

module.exports = router;