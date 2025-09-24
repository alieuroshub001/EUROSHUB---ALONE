const express = require('express');
const router = express.Router();

const Board = require('../models/Board');
const List = require('../models/List');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');
const {
  checkProjectAccess,
  checkBoardAccess,
  checkProjectPermission
} = require('../middleware/projectAuth');

/**
 * @route   GET /api/projects/:projectId/boards
 * @desc    Get project boards
 * @access  Private
 */
router.get('/projects/:projectId/boards', protect, checkProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeArchived = false } = req.query;

    let query = { project: projectId };
    if (!includeArchived || includeArchived === 'false') {
      query.isArchived = false;
    }

    const boards = await Board.find(query)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      })
      .populate({
        path: 'lists',
        match: { isArchived: false },
        options: { sort: { position: 1 } },
        populate: {
          path: 'cards',
          match: { isArchived: false },
          options: { sort: { position: 1 } },
          populate: [
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
              path: 'comments.author',
              select: 'firstName lastName avatar',
              match: { _id: { $ne: null } }
            }
          ]
        }
      })
      .sort({ position: 1, createdAt: -1 });

    // Additional populate for comments.author (deep nested populate sometimes fails)
    for (const board of boards) {
      if (board.lists) {
        for (const list of board.lists) {
          if (list.cards) {
            for (const card of list.cards) {
              if (card.comments && card.comments.length > 0) {
                await card.populate('comments.author', 'firstName lastName avatar');
              }
            }
          }
        }
      }
    }

    // Filter out null user references
    const sanitizedBoards = boards.map(board => {
      const boardObj = board.toObject();

      // Handle null createdBy
      if (!boardObj.createdBy) {
        boardObj.createdBy = null;
      }

      // Handle lists with null user references
      if (boardObj.lists) {
        boardObj.lists = boardObj.lists.map(list => {
          if (!list.createdBy) {
            list.createdBy = null;
          }

          if (list.cards) {
            list.cards = list.cards.map(card => {
              if (!card.createdBy) {
                card.createdBy = null;
              }

              // Filter out null assignedTo users
              if (card.assignedTo) {
                card.assignedTo = card.assignedTo.filter(user => user !== null);
              }

              return card;
            });
          }

          return list;
        });
      }

      return boardObj;
    });

    res.status(200).json({
      success: true,
      data: sanitizedBoards
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
 * @route   GET /api/boards/:boardId
 * @desc    Get board details with lists and cards
 * @access  Private
 */
router.get('/:boardId', protect, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;

    // Populate board with lists and cards
    await board.populate([
      {
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'lists',
        match: { isArchived: false },
        options: { sort: { position: 1 } },
        populate: {
          path: 'cards',
          match: { isArchived: false },
          options: { sort: { position: 1 } },
          populate: [
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
          ]
        }
      }
    ]);

    // Sanitize board data
    const boardObj = board.toObject();

    // Handle null createdBy
    if (!boardObj.createdBy) {
      boardObj.createdBy = null;
    }

    // Handle lists with null user references
    if (boardObj.lists) {
      boardObj.lists = boardObj.lists.map(list => {
        if (!list.createdBy) {
          list.createdBy = null;
        }

        if (list.cards) {
          list.cards = list.cards.map(card => {
            if (!card.createdBy) {
              card.createdBy = null;
            }

            // Filter out null assignedTo users
            if (card.assignedTo) {
              card.assignedTo = card.assignedTo.filter(user => user !== null);
            }

            return card;
          });
        }

        return list;
      });
    }

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
 * @route   POST /api/projects/:projectId/boards
 * @desc    Create new board
 * @access  Private
 */
router.post('/projects/:projectId/boards', protect, checkProjectAccess, checkProjectPermission('write'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      color,
      isDefault,
      settings,
      createDefaultLists = true
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Board title is required'
      });
    }

    // Create board
    const board = new Board({
      title,
      description: description || '',
      project: projectId,
      createdBy: req.user.id,
      color: color || '#4F46E5',
      isDefault: isDefault || false,
      settings: settings || {}
    });

    await board.save();

    // Create default lists if requested
    if (createDefaultLists) {
      await List.createDefaultLists(board._id, projectId, req.user.id);
    }

    // Log activity
    await Activity.logActivity({
      type: 'board_created',
      user: req.user.id,
      project: projectId,
      board: board._id,
      metadata: {
        entityName: board.title,
        entityId: board._id
      }
    });

    // Populate for response
    await board.populate([
      {
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'lists',
        options: { sort: { position: 1 } }
      }
    ]);

    // Sanitize board data
    const boardObj = board.toObject();
    if (!boardObj.createdBy) {
      boardObj.createdBy = null;
    }

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
 * @route   PUT /api/boards/:boardId
 * @desc    Update board
 * @access  Private
 */
router.put('/:boardId', protect, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const {
      title,
      description,
      color,
      settings
    } = req.body;

    // Check if user has permission to update board
    const hasPermission = await board.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this board'
      });
    }

    // Track changes for activity log
    const changes = [];

    if (title && title !== board.title) {
      changes.push({ field: 'title', oldValue: board.title, newValue: title });
      board.title = title;
    }

    if (description !== undefined && description !== board.description) {
      changes.push({ field: 'description', oldValue: board.description, newValue: description });
      board.description = description;
    }

    if (color && color !== board.color) {
      changes.push({ field: 'color', oldValue: board.color, newValue: color });
      board.color = color;
    }

    if (settings) {
      const oldSettings = JSON.stringify(board.settings);
      const newSettings = JSON.stringify({ ...board.settings, ...settings });
      if (oldSettings !== newSettings) {
        changes.push({ field: 'settings', oldValue: board.settings, newValue: { ...board.settings, ...settings } });
        board.settings = { ...board.settings, ...settings };
      }
    }

    await board.save();

    // Log activity if there were changes
    if (changes.length > 0) {
      await Activity.logActivity({
        type: 'board_updated',
        user: req.user.id,
        project: board.project,
        board: board._id,
        metadata: {
          entityName: board.title,
          entityId: board._id,
          changes
        }
      });
    }

    res.status(200).json({
      success: true,
      data: board,
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
router.delete('/:boardId', protect, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;

    // Check if user has permission to delete board
    const hasPermission = await board.hasPermission(req.user.id, 'delete');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this board'
      });
    }

    const boardTitle = board.title;
    const projectId = board.project;

    // Log activity before deletion
    await Activity.logActivity({
      type: 'board_deleted',
      user: req.user.id,
      project: projectId,
      board: board._id,
      metadata: {
        entityName: boardTitle,
        entityId: board._id
      }
    });

    // Delete board (this will trigger pre-remove middleware to clean up lists and cards)
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
 * @route   PUT /api/boards/:boardId/archive
 * @desc    Archive/unarchive board
 * @access  Private
 */
router.put('/:boardId/archive', protect, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const { archive = true } = req.body;

    // Check if user has permission to archive board
    const hasPermission = await board.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this board'
      });
    }

    board.isArchived = archive;
    await board.save();

    // Log activity
    await Activity.logActivity({
      type: 'board_archived',
      user: req.user.id,
      project: board.project,
      board: board._id,
      data: {
        newValue: archive
      },
      metadata: {
        entityName: board.title,
        entityId: board._id
      }
    });

    res.status(200).json({
      success: true,
      data: board,
      message: `Board ${archive ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    console.error('Archive board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving board'
    });
  }
});

/**
 * @route   PUT /api/boards/reorder
 * @desc    Reorder boards within a project
 * @access  Private
 */
router.put('/reorder', protect, async (req, res) => {
  try {
    const { boardPositions } = req.body;

    if (!boardPositions || !Array.isArray(boardPositions)) {
      return res.status(400).json({
        success: false,
        message: 'Board positions array is required'
      });
    }

    // Validate and update board positions
    const bulkOps = [];
    for (const { boardId, position } of boardPositions) {
      // Check if user has access to the board
      const board = await Board.findById(boardId).populate('project');
      if (!board) continue;

      const hasAccess = await board.hasAccess(req.user.id, req.user.role);
      if (!hasAccess) continue;

      bulkOps.push({
        updateOne: {
          filter: { _id: boardId },
          update: { position: position }
        }
      });
    }

    if (bulkOps.length > 0) {
      await Board.bulkWrite(bulkOps);
    }

    res.status(200).json({
      success: true,
      message: 'Board positions updated successfully'
    });
  } catch (error) {
    console.error('Reorder boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering boards'
    });
  }
});

/**
 * @route   POST /api/boards/:boardId/duplicate
 * @desc    Duplicate board
 * @access  Private
 */
router.post('/:boardId/duplicate', protect, checkBoardAccess, async (req, res) => {
  try {
    const originalBoard = req.board;
    const { title, includeCards = false } = req.body;

    // Check if user has permission to create boards
    const hasPermission = await originalBoard.hasPermission(req.user.id, 'write');
    if (!hasPermission && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to duplicate this board'
      });
    }

    // Create new board
    const newBoard = new Board({
      title: title || `${originalBoard.title} (Copy)`,
      description: originalBoard.description,
      project: originalBoard.project,
      createdBy: req.user.id,
      color: originalBoard.color,
      settings: originalBoard.settings
    });

    await newBoard.save();

    // Duplicate lists
    const originalLists = await List.find({ board: originalBoard._id }).sort({ position: 1 });

    for (const originalList of originalLists) {
      const newList = new List({
        title: originalList.title,
        description: originalList.description,
        board: newBoard._id,
        project: originalBoard.project,
        createdBy: req.user.id,
        position: originalList.position,
        color: originalList.color,
        listType: originalList.listType,
        settings: originalList.settings
      });

      await newList.save();

      // Duplicate cards if requested
      if (includeCards) {
        const Card = require('../models/Card');
        const originalCards = await Card.find({ list: originalList._id }).sort({ position: 1 });

        for (const originalCard of originalCards) {
          const newCard = new Card({
            title: originalCard.title,
            description: originalCard.description,
            list: newList._id,
            board: newBoard._id,
            project: originalBoard.project,
            createdBy: req.user.id,
            position: originalCard.position,
            priority: originalCard.priority,
            labels: [...originalCard.labels],
            customFields: [...originalCard.customFields]
          });

          await newCard.save();
        }
      }
    }

    // Log activity
    await Activity.logActivity({
      type: 'board_created',
      user: req.user.id,
      project: originalBoard.project,
      board: newBoard._id,
      data: {
        comment: `Duplicated from "${originalBoard.title}"`
      },
      metadata: {
        entityName: newBoard.title,
        entityId: newBoard._id
      }
    });

    // Populate for response
    await newBoard.populate([
      {
        path: 'createdBy',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'lists',
        options: { sort: { position: 1 } }
      }
    ]);

    // Sanitize board data
    const boardObj = newBoard.toObject();
    if (!boardObj.createdBy) {
      boardObj.createdBy = null;
    }

    res.status(201).json({
      success: true,
      data: boardObj,
      message: 'Board duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating board'
    });
  }
});

/**
 * @route   GET /api/boards
 * @desc    Get user's accessible boards
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const boards = await Board.getAccessibleBoards(req.user.id, req.user.role);

    // Sanitize boards data
    const sanitizedBoards = boards.map(board => {
      const boardObj = board.toObject();

      // Handle null createdBy
      if (!boardObj.createdBy) {
        boardObj.createdBy = null;
      }

      return boardObj;
    });

    res.status(200).json({
      success: true,
      data: sanitizedBoards
    });
  } catch (error) {
    console.error('Get accessible boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching boards'
    });
  }
});

module.exports = router;