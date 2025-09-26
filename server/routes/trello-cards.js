const express = require('express');
const router = express.Router();

const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

// Middleware to get list and check access
const getListWithAccess = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    const hasAccess = await list.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this list'
      });
    }

    req.list = list;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking list access'
    });
  }
};

// Middleware to get card and check access
const getCardWithAccess = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId)
      .populate('listId')
      .populate('createdBy', 'firstName lastName avatar')
      .populate('members.userId', 'firstName lastName avatar');

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const hasAccess = await card.hasAccess(req.user.id, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this card'
      });
    }

    req.card = card;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking card access'
    });
  }
};

/**
 * @route   GET /api/lists/:listId/cards
 * @desc    Get all cards in a list
 * @access  Private
 */
router.get('/:listId/cards', protect, getListWithAccess, async (req, res) => {
  try {
    const cards = await Card.find({
      listId: req.params.listId,
      isArchived: false
    })
    .populate('createdBy', 'firstName lastName avatar')
    .populate('members.userId', 'firstName lastName avatar')
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
 * @desc    Create new card in list
 * @access  Private
 */
router.post('/:listId/cards', protect, getListWithAccess, async (req, res) => {
  try {
    const {
      title,
      description,
      coverImage,
      labels,
      dueDate,
      position
    } = req.body;

    // Check permission
    const hasPermission = await req.list.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create cards in this list'
      });
    }

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Card title is required'
      });
    }

    // Get next position if not provided
    let cardPosition = position;
    if (typeof position !== 'number') {
      const maxPositionCard = await Card.findOne(
        { listId: req.params.listId },
        {},
        { sort: { position: -1 } }
      );
      cardPosition = maxPositionCard ? maxPositionCard.position + 1 : 1;
    }

    const card = new Card({
      title: title.trim(),
      description: description || '',
      listId: req.params.listId,
      createdBy: req.user.id,
      position: cardPosition,
      coverImage: coverImage || null,
      labels: labels || [],
      dueDate: dueDate || null
    });

    await card.save();
    await card.populate([
      { path: 'createdBy', select: 'firstName lastName avatar' },
      { path: 'members.userId', select: 'firstName lastName avatar' }
    ]);

    // Update list metadata
    await List.findByIdAndUpdate(req.params.listId, {
      $inc: { 'metadata.cardCount': 1 }
    });

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
 * @route   GET /api/cards/:cardId
 * @desc    Get single card details
 * @access  Private
 */
router.get('/:cardId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;

    // Get activities for this card
    const activities = await Activity.find({ cardId: card._id })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const cardObj = card.toObject();
    cardObj.activities = activities;

    res.status(200).json({
      success: true,
      data: cardObj
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
router.put('/:cardId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this card'
      });
    }

    const {
      title,
      description,
      coverImage,
      labels,
      dueDate
    } = req.body;

    // Update fields
    if (title && title.trim()) card.title = title.trim();
    if (description !== undefined) card.description = description;
    if (coverImage !== undefined) card.coverImage = coverImage;
    if (labels) card.labels = labels;
    if (dueDate !== undefined) card.dueDate = dueDate;

    await card.save();

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
router.delete('/:cardId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'delete', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this card'
      });
    }

    // Delete card (pre-remove middleware will handle cleanup)
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
 * @route   POST /api/cards/:cardId/move
 * @desc    Move card to different list
 * @access  Private
 */
router.post('/:cardId/move', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { targetListId, position } = req.body;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to move this card'
      });
    }

    if (!targetListId) {
      return res.status(400).json({
        success: false,
        message: 'Target list ID is required'
      });
    }

    // Verify target list exists and user has access
    const targetList = await List.findById(targetListId);
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
        message: 'Access denied to target list'
      });
    }

    const oldListId = card.listId;

    // Move card
    await card.moveToList(targetListId, position);

    // Create activity
    await Activity.create({
      type: 'card_moved',
      cardId: card._id,
      userId: req.user.id,
      data: {
        fromList: oldListId,
        toList: targetListId
      }
    });

    res.status(200).json({
      success: true,
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
 * @route   PUT /api/cards/:cardId/reorder
 * @desc    Reorder card position within list
 * @access  Private
 */
router.put('/:cardId/reorder', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { position } = req.body;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder this card'
      });
    }

    if (typeof position !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Position must be a number'
      });
    }

    card.position = position;
    await card.save();

    res.status(200).json({
      success: true,
      message: 'Card position updated successfully'
    });
  } catch (error) {
    console.error('Reorder card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering card'
    });
  }
});

/**
 * @route   POST /api/cards/:cardId/members
 * @desc    Add member to card
 * @access  Private
 */
router.post('/:cardId/members', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { userId } = req.body;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add members to this card'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await card.addMember(userId);

    // Create activity
    await Activity.create({
      type: 'member_added',
      cardId: card._id,
      userId: req.user.id,
      data: { addedUserId: userId }
    });

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
 * @route   DELETE /api/cards/:cardId/members/:userId
 * @desc    Remove member from card
 * @access  Private
 */
router.delete('/:cardId/members/:userId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { userId } = req.params;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove members from this card'
      });
    }

    await card.removeMember(userId);

    // Create activity
    await Activity.create({
      type: 'member_removed',
      cardId: card._id,
      userId: req.user.id,
      data: { removedUserId: userId }
    });

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
 * @route   PUT /api/cards/:cardId/archive
 * @desc    Archive/Unarchive card
 * @access  Private
 */
router.put('/:cardId/archive', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this card'
      });
    }

    card.isArchived = !card.isArchived;
    await card.save();

    // Create activity
    await Activity.create({
      type: card.isArchived ? 'card_archived' : 'card_unarchived',
      cardId: card._id,
      userId: req.user.id
    });

    res.status(200).json({
      success: true,
      data: { isArchived: card.isArchived },
      message: `Card ${card.isArchived ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    console.error('Archive card error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving card'
    });
  }
});

module.exports = router;