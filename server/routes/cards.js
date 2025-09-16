const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Card = require('../models/Card');
const List = require('../models/List');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const { protect: auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get cards for a list
router.get('/', auth, async (req, res) => {
  try {
    const { listId } = req.query;

    if (!listId) {
      return res.status(400).json({
        success: false,
        message: 'List ID is required'
      });
    }

    const list = await List.findById(listId);
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

    const cards = await Card.find({ list: listId, isArchived: false })
      .populate('assignedMembers', 'firstName lastName avatar')
      .populate('labels', 'name color')
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ position: 1 });

    res.status(200).json({
      success: true,
      data: { cards }
    });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cards'
    });
  }
});

// Get single card by ID
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid card ID')
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

    const card = await Card.findById(req.params.id)
      .populate('list', 'name board')
      .populate('assignedMembers', 'firstName lastName avatar email')
      .populate('labels', 'name color')
      .populate('comments')
      .populate('activities')
      .populate('createdBy', 'firstName lastName avatar')
      .populate('completedBy', 'firstName lastName avatar');

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check access permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: { card }
    });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve card'
    });
  }
});

// Create new card
router.post('/', auth, [
  body('title').notEmpty().trim().isLength({ min: 1, max: 200 }).withMessage('Card title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('list').isMongoId().withMessage('Invalid list ID'),
  body('position').optional().isInt({ min: 0 }).withMessage('Position must be a non-negative integer'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('assignedMembers').optional().isArray().withMessage('Assigned members must be an array'),
  body('assignedMembers.*').optional().isMongoId().withMessage('Invalid user ID'),
  body('estimatedHours').optional().isFloat({ min: 0, max: 1000 }).withMessage('Estimated hours must be between 0 and 1000')
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

    // Check if list exists and user has access
    const list = await List.findById(req.body.list).populate({
      path: 'board',
      populate: { path: 'project' }
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    if (!await list.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if list accepts new cards
    if (list.isCardLimitReached) {
      return res.status(400).json({
        success: false,
        message: 'Card limit reached for this list'
      });
    }

    if (list.settings.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'List is locked and cannot accept new cards'
      });
    }

    // Get position for new card
    let position = req.body.position;
    if (position === undefined) {
      const lastCard = await Card.findOne({ list: req.body.list }).sort({ position: -1 });
      position = lastCard ? lastCard.position + 1 : 0;
    }

    const card = new Card({
      ...req.body,
      position,
      createdBy: req.user._id,
      watchers: [req.user._id] // Creator automatically watches the card
    });

    await card.save();

    // Add card to list
    await list.addCard(card._id);

    // Create activity log
    await Activity.createActivity(
      'card_created',
      req.user._id,
      {
        project: list.board.project._id,
        board: list.board._id,
        list: list._id,
        card: card._id
      },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Populate response
    await card.populate('assignedMembers', 'firstName lastName avatar');
    await card.populate('labels', 'name color');
    await card.populate('createdBy', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      data: { card }
    });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create card'
    });
  }
});

// Update card
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Card title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('estimatedHours').optional().isFloat({ min: 0, max: 1000 }).withMessage('Estimated hours must be between 0 and 1000'),
  body('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours cannot be negative')
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

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Track changes for activity log
    const changes = {};
    if (req.body.title && req.body.title !== card.title) {
      changes.title = { old: card.title, new: req.body.title };
    }
    if (req.body.description && req.body.description !== card.description) {
      changes.description = { old: card.description, new: req.body.description };
    }
    if (req.body.priority && req.body.priority !== card.priority) {
      changes.priority = { old: card.priority, new: req.body.priority };
    }

    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('assignedMembers', 'firstName lastName avatar')
    .populate('labels', 'name color')
    .populate('createdBy', 'firstName lastName avatar');

    // Create activity logs for changes
    for (const [field, change] of Object.entries(changes)) {
      await Activity.createActivity(
        `card_${field}_changed`,
        req.user._id,
        {
          project: card.list.board.project._id,
          board: card.list.board._id,
          list: card.list._id,
          card: card._id
        },
        {
          oldValue: change.old,
          newValue: change.new,
          fieldName: field,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Card updated successfully',
      data: { card: updatedCard }
    });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update card'
    });
  }
});

// Move card to different list or position
router.patch('/:id/move', auth, [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('targetList').optional().isMongoId().withMessage('Invalid target list ID'),
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

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const sourceList = card.list;
    const targetListId = req.body.targetList || sourceList._id;
    const newPosition = req.body.position;

    let targetList = sourceList;
    if (targetListId.toString() !== sourceList._id.toString()) {
      targetList = await List.findById(targetListId).populate({
        path: 'board',
        populate: { path: 'project' }
      });

      if (!targetList) {
        return res.status(404).json({
          success: false,
          message: 'Target list not found'
        });
      }

      // Check permissions for target list
      if (!await targetList.canUserAccess(req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to target list'
        });
      }

      // Check if target list accepts new cards
      if (targetList.isCardLimitReached) {
        return res.status(400).json({
          success: false,
          message: 'Card limit reached for target list'
        });
      }

      if (targetList.settings.isLocked) {
        return res.status(400).json({
          success: false,
          message: 'Target list is locked'
        });
      }
    }

    const oldPosition = card.position;
    const sameList = targetListId.toString() === sourceList._id.toString();

    if (sameList && newPosition === oldPosition) {
      return res.status(200).json({
        success: true,
        message: 'Card position unchanged',
        data: { card }
      });
    }

    // Update card positions
    if (sameList) {
      // Moving within the same list
      if (newPosition > oldPosition) {
        // Moving down - decrease position of cards between old and new position
        await Card.updateMany(
          {
            list: sourceList._id,
            position: { $gt: oldPosition, $lte: newPosition },
            _id: { $ne: card._id }
          },
          { $inc: { position: -1 } }
        );
      } else {
        // Moving up - increase position of cards between new and old position
        await Card.updateMany(
          {
            list: sourceList._id,
            position: { $gte: newPosition, $lt: oldPosition },
            _id: { $ne: card._id }
          },
          { $inc: { position: 1 } }
        );
      }
    } else {
      // Moving to different list
      // Remove from source list
      await sourceList.removeCard(card._id);
      await Card.updateMany(
        {
          list: sourceList._id,
          position: { $gt: oldPosition }
        },
        { $inc: { position: -1 } }
      );

      // Add to target list
      await Card.updateMany(
        {
          list: targetList._id,
          position: { $gte: newPosition }
        },
        { $inc: { position: 1 } }
      );

      await targetList.addCard(card._id);
      card.list = targetList._id;
    }

    // Update card position
    card.position = newPosition;
    await card.save();

    // Create activity log
    await Activity.createActivity(
      'card_moved',
      req.user._id,
      {
        project: targetList.board.project._id,
        board: targetList.board._id,
        list: targetList._id,
        card: card._id
      },
      {
        fromList: sameList ? null : sourceList._id,
        toList: targetList._id,
        position: newPosition,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await card.populate('assignedMembers', 'firstName lastName avatar');
    await card.populate('labels', 'name color');

    res.status(200).json({
      success: true,
      message: 'Card moved successfully',
      data: { card }
    });
  } catch (error) {
    console.error('Move card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move card'
    });
  }
});

// Toggle card completion
router.patch('/:id/toggle-complete', auth, [
  param('id').isMongoId().withMessage('Invalid card ID')
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

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (card.isCompleted) {
      await card.markIncomplete();
    } else {
      await card.markComplete(req.user._id);
    }

    // Create activity log
    await Activity.createActivity(
      card.isCompleted ? 'card_completed' : 'card_reopened',
      req.user._id,
      {
        project: card.list.board.project._id,
        board: card.list.board._id,
        list: card.list._id,
        card: card._id
      },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await card.populate('completedBy', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: `Card ${card.isCompleted ? 'completed' : 'reopened'} successfully`,
      data: { card }
    });
  } catch (error) {
    console.error('Toggle card completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle card completion'
    });
  }
});

// Assign/unassign member to card
router.patch('/:id/assign', auth, [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('userId').isMongoId().withMessage('Invalid user ID')
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

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userId = req.body.userId;
    const isAssigned = card.assignedMembers.includes(userId);

    if (isAssigned) {
      await card.unassignMember(userId);
    } else {
      await card.assignMember(userId);
    }

    // Create activity log
    const User = require('../models/User');
    const targetUser = await User.findById(userId);

    await Activity.createActivity(
      isAssigned ? 'card_unassigned' : 'card_assigned',
      req.user._id,
      {
        project: card.list.board.project._id,
        board: card.list.board._id,
        list: card.list._id,
        card: card._id
      },
      {
        targetUser: targetUser._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await card.populate('assignedMembers', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: `Member ${isAssigned ? 'unassigned from' : 'assigned to'} card successfully`,
      data: { card }
    });
  } catch (error) {
    console.error('Assign/unassign member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign/unassign member'
    });
  }
});

// Add attachment to card
router.post('/:id/attachments', auth, upload.single('file'), [
  param('id').isMongoId().withMessage('Invalid card ID')
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const attachment = {
      name: req.file.originalname,
      url: `/uploads/attachments/${req.file.filename}`,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    await card.addAttachment(attachment);

    // Create activity log
    await Activity.createActivity(
      'card_attachment_added',
      req.user._id,
      {
        project: card.list.board.project._id,
        board: card.list.board._id,
        list: card.list._id,
        card: card._id
      },
      {
        attachmentName: attachment.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(201).json({
      success: true,
      message: 'Attachment added successfully',
      data: { attachment }
    });
  } catch (error) {
    console.error('Add attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add attachment'
    });
  }
});

// Add checklist to card
router.post('/:id/checklists', auth, [
  param('id').isMongoId().withMessage('Invalid card ID'),
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Checklist name must be between 1 and 100 characters')
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

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await card.addChecklist(req.body.name);

    // Create activity log
    await Activity.createActivity(
      'card_checklist_added',
      req.user._id,
      {
        project: card.list.board.project._id,
        board: card.list.board._id,
        list: card.list._id,
        card: card._id
      },
      {
        checklistName: req.body.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(201).json({
      success: true,
      message: 'Checklist added successfully',
      data: { checklist: card.checklist[card.checklist.length - 1] }
    });
  } catch (error) {
    console.error('Add checklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add checklist'
    });
  }
});

// Get card activity
router.get('/:id/activity', auth, [
  param('id').isMongoId().withMessage('Invalid card ID')
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

    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check access permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const activities = await Activity.getCardActivity(req.params.id, limit, page);

    res.status(200).json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    console.error('Get card activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve card activity'
    });
  }
});

// Archive card
router.patch('/:id/archive', auth, [
  param('id').isMongoId().withMessage('Invalid card ID')
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

    const card = await Card.findById(req.params.id).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: { path: 'project' }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check permissions
    if (!await card.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    card.isArchived = true;
    card.archivedAt = new Date();
    await card.save();

    // Remove card from list
    await List.findByIdAndUpdate(
      card.list._id,
      { $pull: { cards: card._id } }
    );

    // Create activity log
    await Activity.createActivity(
      'card_archived',
      req.user._id,
      {
        project: card.list.board.project._id,
        board: card.list.board._id,
        list: card.list._id,
        card: card._id
      },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(200).json({
      success: true,
      message: 'Card archived successfully'
    });
  } catch (error) {
    console.error('Archive card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive card'
    });
  }
});

module.exports = router;