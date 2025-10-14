const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Activity = require('../models/Activity');
const User = require('../models/User');
const slackService = require('../utils/slackService');
const { protect } = require('../middleware/auth');

// Configure Cloudinary storage for board backgrounds
const boardBackgroundStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'euroshub/board-backgrounds',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 1920,
        height: 1080,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => `board-bg-${req.user.id}-${Date.now()}`
  },
});

const uploadBoardBackground = multer({
  storage: boardBackgroundStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

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
      const userIdStr = req.user.id.toString();
      boardObj.isStarred = boardObj.starredBy?.some(id => id.toString() === userIdStr) || false;

      console.log(`Board ${boardObj.name}: starredBy=${boardObj.starredBy?.map(id => id.toString())}, isStarred=${boardObj.isStarred}`);

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
      const lists = await List.createDefaultLists(board._id, null, req.user.id);

      // Update board metadata
      board.metadata.totalLists = lists.length;
      await board.save();
    }

    // Reload board to get the updated members from pre-save middleware
    const savedBoard = await Board.findById(board._id)
      .populate('createdBy', 'firstName lastName avatar')
      .populate('members.userId', 'firstName lastName avatar');

    const boardObj = savedBoard.toObject();
    boardObj.isStarred = false;
    boardObj.listsCount = savedBoard.metadata?.totalLists || 0;
    boardObj.cardsCount = savedBoard.metadata?.totalCards || 0;

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

    // Add starred status for current user
    const userIdStr = req.user.id.toString();
    boardObj.isStarred = boardObj.starredBy?.some(id => id.toString() === userIdStr) || false;

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
    console.log('Before toggle - starredBy:', board.starredBy);
    console.log('User ID:', req.user.id, 'Type:', typeof req.user.id);

    await board.toggleStar(req.user.id);

    const isStarred = board.starredBy.some(id => id.toString() === req.user.id.toString());

    console.log('After toggle - starredBy:', board.starredBy);
    console.log('Is starred:', isStarred);

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

    // Get user details for notifications
    const newMember = await User.findById(userId).select('firstName lastName email');
    const addedByUser = await User.findById(req.user.id).select('firstName lastName');

    if (!newMember) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await board.addMember(userId, role);

    // Send Slack notifications
    if (newMember && addedByUser) {
      const memberName = `${newMember.firstName} ${newMember.lastName}`;
      const addedBy = `${addedByUser.firstName} ${addedByUser.lastName}`;

      // Send notification asynchronously (don't block the response)
      slackService.notifyBoardMemberAdded({
        boardName: board.name,
        memberName: memberName,
        memberEmail: newMember.email,
        addedBy: addedBy,
        role: role,
        boardId: board._id
      }).catch(error => {
        console.error('❌ Failed to send board member added notification:', error);
      });
    }

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
 * @route   PUT /api/boards/:boardId/members/:userId/role
 * @desc    Update member role on board
 * @access  Private
 */
router.put('/:boardId/members/:userId/role', protect, getBoardWithAccess, async (req, res) => {
  try {
    const board = req.board;
    const { userId } = req.params;
    const { role } = req.body;

    // Check permission - only board owners/admins can change roles
    const userMember = board.members.find(m => m.userId && m.userId.toString() === req.user.id.toString());
    const userRole = userMember?.role || 'viewer';

    if (!['owner', 'admin'].includes(userRole) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update member roles'
      });
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Find and update the member
    const memberIndex = board.members.findIndex(m => m.userId && m.userId.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this board'
      });
    }

    board.members[memberIndex].role = role;
    await board.save();

    res.status(200).json({
      success: true,
      data: { member: board.members[memberIndex] },
      message: 'Member role updated successfully'
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating member role'
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

/**
 * @route   POST /api/trello-boards/upload-background
 * @desc    Upload board background image
 * @access  Private
 */
router.post('/upload-background', protect, uploadBoardBackground.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        url: req.file.path,
        publicId: req.file.filename
      },
      message: 'Background image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload background error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading background image'
    });
  }
});

module.exports = router;