const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const Board = require('../models/Board');
const List = require('../models/List');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const { protect: auth } = require('../middleware/auth');

// Get boards for a project
router.get('/',
  auth,
  [
    query('projectId').optional().isMongoId().withMessage('Invalid project ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { isArchived: false };

    if (req.query.projectId) {
      query.project = req.query.projectId;

      // Check if user has access to the project
      const project = await Project.findById(req.query.projectId);
      if (!project || !project.canUserAccess(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else {
      // Get boards from user's accessible projects
      const accessibleProjects = await Project.find({
        $or: [
          { owner: req.user._id },
          { 'members.user': req.user._id },
          { 'settings.isPrivate': false }
        ]
      }).select('_id');

      query.project = { $in: accessibleProjects.map(p => p._id) };
    }

    const boards = await Board.find(query)
      .populate('project', 'name')
      .populate('lists')
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ position: 1, updatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalBoards = await Board.countDocuments(query);
    const totalPages = Math.ceil(totalBoards / limit);

    res.status(200).json({
      success: true,
      data: {
        boards,
        pagination: {
          currentPage: page,
          totalPages,
          totalBoards,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve boards'
    });
  }
});

// Get single board by ID
router.get('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid board ID')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const board = await Board.findById(req.params.id)
      .populate('project', 'name owner members settings')
      .populate({
        path: 'lists',
        populate: {
          path: 'cards',
          populate: [
            { path: 'assignedMembers', select: 'firstName lastName avatar' },
            { path: 'labels', select: 'name color' }
          ]
        },
        options: { sort: { position: 1 } }
      })
      .populate('createdBy', 'firstName lastName avatar');

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

    // Set current user for virtuals
    board._currentUser = req.user._id;

    res.status(200).json({
      success: true,
      data: { board }
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve board'
    });
  }
});

// Create new board
router.post('/',
  auth,
  [
    body('name').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Board name must be between 1 and 100 characters'),
    body('description').optional().trim().isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
    body('project').isMongoId().withMessage('Invalid project ID'),
    body('backgroundColor').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid background color'),
    body('isTemplate').optional().isBoolean().withMessage('isTemplate must be boolean'),
    body('templateCategory').optional().isIn(['project_management', 'hr', 'marketing', 'development', 'design', 'other']).withMessage('Invalid template category')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if project exists and user has access
    const project = await Project.findById(req.body.project);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get position for new board
    const lastBoard = await Board.findOne({ project: req.body.project }).sort({ position: -1 });
    const position = lastBoard ? lastBoard.position + 1 : 0;

    const boardData = {
      ...req.body,
      position,
      createdBy: req.user._id,
      lists: [],
      labels: [
        { name: 'High Priority', color: '#eb5a46' },
        { name: 'Medium Priority', color: '#f2d600' },
        { name: 'Low Priority', color: '#61bd4f' },
        { name: 'Bug', color: '#ff9f1a' },
        { name: 'Feature', color: '#026aa7' },
        { name: 'Enhancement', color: '#c377e0' }
      ]
    };

    const board = new Board(boardData);
    await board.save();

    // Add board to project
    project.boards.push(board._id);
    await project.save();

    // Create default lists
    const defaultLists = [
      { name: 'To Do', position: 0 },
      { name: 'In Progress', position: 1 },
      { name: 'Review', position: 2 },
      { name: 'Done', position: 3 }
    ];

    for (const listData of defaultLists) {
      const list = new List({
        ...listData,
        board: board._id,
        createdBy: req.user._id,
        cards: []
      });
      await list.save();
      board.lists.push(list._id);
    }

    await board.save();

    // Create activity log
    await Activity.createActivity(
      'board_created',
      req.user._id,
      { project: project._id, board: board._id },
      {
        newValue: board.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Populate response
    await board.populate('project', 'name');
    await board.populate('lists');

    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: { board }
    });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create board'
    });
  }
});

// Update board
router.put('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid board ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Board name must be between 1 and 100 characters'),
    body('description').optional().trim().isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
    body('backgroundColor').optional().matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid background color')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const board = await Board.findById(req.params.id).populate('project');

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    if (!await board.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const oldName = board.name;
    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('project', 'name');

    // Create activity log if name changed
    if (req.body.name && req.body.name !== oldName) {
      await Activity.createActivity(
        'board_renamed',
        req.user._id,
        { project: board.project._id, board: board._id },
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
      message: 'Board updated successfully',
      data: { board: updatedBoard }
    });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update board'
    });
  }
});

// Toggle board star
router.patch('/:id/star',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid board ID')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    if (!await board.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await board.toggleStar(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Board star toggled successfully',
      data: { isStarred: board.starred.includes(req.user._id) }
    });
  } catch (error) {
    console.error('Toggle board star error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle board star'
    });
  }
});

// Add label to board
router.post('/:id/labels',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid board ID'),
    body('name').notEmpty().trim().isLength({ min: 1, max: 50 }).withMessage('Label name must be between 1 and 50 characters'),
    body('color').matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid label color')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    if (!await board.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await board.addLabel(req.body.name, req.body.color);

    // Create activity log
    await Activity.createActivity(
      'board_label_created',
      req.user._id,
      { project: board.project, board: board._id },
      {
        labelName: req.body.name,
        labelColor: req.body.color,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(201).json({
      success: true,
      message: 'Label added successfully',
      data: { labels: board.labels }
    });
  } catch (error) {
    console.error('Add label error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add label'
    });
  }
});

// Get board activity
router.get('/:id/activity',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid board ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const board = await Board.findById(req.params.id);

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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const activities = await Activity.getBoardActivity(req.params.id, limit, page);

    res.status(200).json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    console.error('Get board activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve board activity'
    });
  }
});

// Archive board
router.patch('/:id/archive',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid board ID')
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const board = await Board.findById(req.params.id).populate('project');

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check permissions
    const userRole = board.project.getMemberRole(req.user._id);
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' &&
        board.project.owner.toString() !== req.user._id.toString() &&
        userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    board.isArchived = true;
    board.archivedAt = new Date();
    await board.save();

    // Create activity log
    await Activity.createActivity(
      'board_archived',
      req.user._id,
      { project: board.project._id, board: board._id },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(200).json({
      success: true,
      message: 'Board archived successfully'
    });
  } catch (error) {
    console.error('Archive board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive board'
    });
  }
});

module.exports = router;