const express = require('express');
const router = express.Router();

const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const Activity = require('../models/Activity');
const User = require('../models/User');
const slackService = require('../utils/slackService');
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
      color,
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
      color: color || null,
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

    // Get list and board info for activity logging
    const list = await List.findById(req.params.listId).select('boardId project');

    // Log activity
    if (list) {
      await Activity.logActivity({
        type: 'card_created',
        user: req.user.id,
        project: list.project || null,
        board: list.boardId,
        list: req.params.listId,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id
        }
      });

      // Emit socket event for card creation
      if (req.io && list.boardId) {
        req.io.to(`board:${list.boardId.toString()}`).emit('card:created', {
          listId: req.params.listId,
          card: card,
          createdBy: {
            id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName
          }
        });
      }
    }

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

    // Populate tasks.assignedTo before returning
    await card.populate({
      path: 'tasks.assignedTo',
      select: 'firstName lastName avatar'
    });

    // Get activities for this card
    const activities = await Activity.find({ cardId: card._id })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const cardObj = card.toObject();
    cardObj.activities = activities;

    // Ensure tasks are included in the response
    cardObj.tasks = card.tasks || [];
    cardObj.comments = card.comments || [];
    cardObj.attachments = card.attachments || [];

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
      color,
      labels,
      dueDate,
      startDate,
      budget,
      category,
      priority,
      status,
      progress,
      estimatedHours,
      actualHours
    } = req.body;

    // Track changes for activity log
    const changes = [];

    // Update fields and track changes
    if (title && title.trim() && title.trim() !== card.title) {
      changes.push({ field: 'title', oldValue: card.title, newValue: title.trim() });
      card.title = title.trim();
    }
    if (description !== undefined && description !== card.description) {
      changes.push({ field: 'description', oldValue: card.description, newValue: description });
      card.description = description;
    }
    if (coverImage !== undefined && coverImage !== card.coverImage) {
      changes.push({ field: 'coverImage', oldValue: card.coverImage, newValue: coverImage });
      card.coverImage = coverImage;
    }
    if (color !== undefined && color !== card.color) {
      changes.push({ field: 'color', oldValue: card.color, newValue: color });
      card.color = color;
    }
    if (labels && JSON.stringify(labels) !== JSON.stringify(card.labels)) {
      changes.push({ field: 'labels', oldValue: [...card.labels], newValue: labels });
      card.labels = labels;
    }
    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;
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
    if (budget !== undefined && budget !== card.budget) {
      changes.push({ field: 'budget', oldValue: card.budget, newValue: budget });
      card.budget = budget;
    }
    if (category !== undefined && category !== card.category) {
      changes.push({ field: 'category', oldValue: card.category, newValue: category });
      card.category = category;
    }
    if (priority !== undefined && priority !== card.priority) {
      changes.push({ field: 'priority', oldValue: card.priority, newValue: priority });
      card.priority = priority;
    }
    if (status !== undefined && status !== card.status) {
      changes.push({ field: 'status', oldValue: card.status, newValue: status });
      card.status = status;
    }
    if (progress !== undefined && progress !== card.progress) {
      changes.push({ field: 'progress', oldValue: card.progress, newValue: progress });
      card.progress = progress;
    }
    if (estimatedHours !== undefined) {
      if (!card.timeTracking) card.timeTracking = {};
      if (estimatedHours !== card.timeTracking.estimated) {
        changes.push({ field: 'estimatedHours', oldValue: card.timeTracking.estimated, newValue: estimatedHours });
        card.timeTracking.estimated = estimatedHours;
      }
    }
    if (actualHours !== undefined) {
      if (!card.timeTracking) card.timeTracking = {};
      if (actualHours !== card.timeTracking.spent) {
        changes.push({ field: 'actualHours', oldValue: card.timeTracking.spent, newValue: actualHours });
        card.timeTracking.spent = actualHours;
      }
    }

    await card.save();

    // Log activity if there were changes
    if (changes.length > 0) {
      // Get board ID from list
      const list = await List.findById(card.listId).select('boardId');

      await Activity.logActivity({
        type: 'card_updated',
        user: req.user.id,
        project: card.project || null,
        board: list ? list.boardId : null,
        list: card.listId,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id,
          changes
        }
      });
    }

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

    // Store card info before deletion for activity log
    const cardTitle = card.title;
    const cardId = card._id;
    const projectId = card.project;
    const listId = card.listId;

    // Get board ID from list
    const list = await List.findById(listId).select('boardId');

    // Log activity before deletion
    await Activity.logActivity({
      type: 'card_deleted',
      user: req.user.id,
      project: projectId || null,
      board: list ? list.boardId : null,
      list: listId,
      card: cardId,
      metadata: {
        entityName: cardTitle,
        entityId: cardId
      }
    });

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
    await card.save();

    // Get the board and project info for activity logging
    const board = await Board.findById(targetList.boardId).populate('project');

    // Create activity (only if board has a project)
    if (board.project) {
      await Activity.create({
        type: 'card_moved',
        user: req.user.id,
        project: board.project._id,
        board: board._id,
        card: card._id,
        data: {
          fromList: oldListId,
          toList: targetListId
        }
      });
    }

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
    const { userId, role = 'member' } = req.body;

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

    // Verify user exists
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = card.members.find(member =>
      member.userId && member.userId.toString() === userId.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this card'
      });
    }

    // Add member with role
    card.members.push({
      userId: userId,
      role: role
    });

    // Add as watcher if not already watching
    const watcherIds = card.watchers.map(id => id.toString());
    if (!watcherIds.includes(userId.toString())) {
      card.watchers.push(userId);
    }

    await card.save();

    // Populate member details for response
    await card.populate('members.userId', 'firstName lastName avatar');

    // Create activity
    await Activity.create({
      type: 'member_added',
      cardId: card._id,
      userId: req.user.id,
      data: { addedUserId: userId, role: role }
    });

    res.status(200).json({
      success: true,
      data: card.members,
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
 * @route   PUT /api/cards/:cardId/members/:userId/role
 * @desc    Update member role on card
 * @access  Private
 */
router.put('/:cardId/members/:userId/role', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { userId } = req.params;
    const { role } = req.body;

    // Check permission - only project managers and leads can change roles
    const userMember = card.members.find(m => m.userId && m.userId.toString() === req.user.id.toString());
    const userRole = userMember?.role || 'viewer';

    if (!['project-manager', 'lead'].includes(userRole) && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update member roles'
      });
    }

    // Validate role
    const validRoles = ['project-manager', 'lead', 'contributor', 'commenter', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Find and update the member
    const memberIndex = card.members.findIndex(m => m.userId && m.userId.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this card'
      });
    }

    card.members[memberIndex].role = role;
    await card.save();

    // Create activity
    await Activity.create({
      type: 'member_role_updated',
      cardId: card._id,
      userId: req.user.id,
      data: { updatedUserId: userId, newRole: role }
    });

    res.status(200).json({
      success: true,
      data: { member: card.members[memberIndex] },
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

// ====== TASK MANAGEMENT APIS ======

/**
 * @route   POST /api/cards/:cardId/tasks
 * @desc    Add task to card
 * @access  Private
 */
router.post('/:cardId/tasks', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const {
      title,
      description,
      assignedTo,
      dueDate,
      priority = 'medium',
      dependsOn = null,
      autoAssignOnUnlock = false,
      assignToOnUnlock = []
    } = req.body;

    console.log('ADD TASK DEBUG - RAW REQUEST:', {
      cardId: req.params.cardId,
      body: req.body,
      assignedToRaw: assignedTo,
      assignedToType: typeof assignedTo,
      isArray: Array.isArray(assignedTo)
    });

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add tasks to this card'
      });
    }

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    // Verify dependency task exists if provided
    if (dependsOn) {
      const dependencyTask = card.tasks.id(dependsOn);
      if (!dependencyTask) {
        return res.status(404).json({
          success: false,
          message: 'Dependency task not found'
        });
      }
    }

    // Verify assigned user(s) exist if provided
    const User = require('../models/User');
    if (assignedTo) {
      // Handle both single user (string) and multiple users (array)
      const userIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      for (const userId of userIds) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: `Assigned user ${userId} not found`
          });
        }
      }
    }

    // Verify users to auto-assign exist if provided
    if (assignToOnUnlock && assignToOnUnlock.length > 0) {
      for (const userId of assignToOnUnlock) {
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: `User ${userId} in assignToOnUnlock not found`
          });
        }
      }
    }

    // Ensure assignedTo is an array (or empty array if not provided)
    let assignedToArray = [];
    if (assignedTo) {
      assignedToArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    }

    const taskData = {
      title: title.trim(),
      description: description || '',
      assignedTo: assignedToArray,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority,
      dependsOn: dependsOn,
      autoAssignOnUnlock: autoAssignOnUnlock,
      assignToOnUnlock: assignToOnUnlock
    };

    console.log('Processed task data BEFORE addTask:', {
      taskData,
      assignedToArray,
      assignedToLength: assignedToArray.length
    });

    card.addTask(taskData, req.user.id);

    console.log('Task added to card, BEFORE save:', {
      lastTask: card.tasks[card.tasks.length - 1],
      assignedToCount: card.tasks[card.tasks.length - 1].assignedTo?.length
    });

    await card.save();

    console.log('Card saved, BEFORE populate:', {
      lastTask: card.tasks[card.tasks.length - 1],
      assignedToCount: card.tasks[card.tasks.length - 1].assignedTo?.length
    });

    // Populate the card to get user details
    await card.populate('tasks.assignedTo tasks.assignToOnUnlock');

    // Get the newly added task (it will be the last one)
    const addedTask = card.tasks[card.tasks.length - 1];

    console.log('AFTER populate - FINAL RESULT:', {
      taskId: addedTask._id,
      taskTitle: addedTask.title,
      assignedTo: addedTask.assignedTo,
      assignedToCount: addedTask.assignedTo?.length,
      assignToOnUnlock: addedTask.assignToOnUnlock,
      totalTasks: card.tasks.length
    });

    // Log activity for task creation
    const list = await List.findById(card.listId).populate('boardId');
    await Activity.logActivity({
      type: 'card_task_added',
      user: req.user.id,
      project: card.project || null,
      board: list ? list.boardId?._id : null,
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        taskTitle: addedTask.title,
        taskId: addedTask._id
      }
    });

    // Send Slack notification for initial task assignment
    if (addedTask.assignedTo && addedTask.assignedTo.length > 0 && list && list.boardId) {
      const board = list.boardId;
      const createdByUser = await User.findById(req.user.id).select('firstName lastName');

      for (const userId of addedTask.assignedTo) {
        const assignedUser = await User.findById(userId).select('firstName lastName email');

        if (assignedUser && createdByUser) {
          const assignedUserName = `${assignedUser.firstName} ${assignedUser.lastName}`;
          const createdByName = `${createdByUser.firstName} ${createdByUser.lastName}`;

          // Send Slack notification asynchronously
          slackService.notifyBoardTaskAssigned({
            taskTitle: addedTask.title,
            assignedTo: assignedUserName,
            assignedBy: createdByName,
            dueDate: addedTask.dueDate ? addedTask.dueDate.toLocaleDateString() : null,
            boardName: board.name,
            cardName: card.title,
            assignedToEmail: assignedUser.email
          }).catch(error => {
            console.error('❌ Failed to send board task assignment notification:', error);
          });
        }
      }
    }

    // Emit socket event for real-time update
    if (req.io && list && list.boardId) {
      req.io.to(`board:${list.boardId.toString()}`).emit('task:created', {
        cardId: card._id,
        task: addedTask,
        createdBy: {
          id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName
        }
      });
    }

    res.status(201).json({
      success: true,
      data: addedTask,
      message: addedTask.isLocked
        ? `Task added successfully (locked - waiting for dependency)`
        : 'Task added successfully'
    });
  } catch (error) {
    console.error('Add task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding task'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/tasks/:taskId
 * @desc    Update task in card
 * @access  Private
 */
router.put('/:cardId/tasks/:taskId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { taskId } = req.params;
    const { title, description, completed, assignedTo, dueDate, priority } = req.body;

    console.log('UPDATE TASK DEBUG - RAW REQUEST:', {
      cardId: req.params.cardId,
      taskId: taskId,
      updateData: { title, description, completed, assignedTo, dueDate, priority },
      assignedToType: typeof assignedTo,
      assignedToIsArray: Array.isArray(assignedTo),
      assignedToLength: Array.isArray(assignedTo) ? assignedTo.length : 'N/A'
    });

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update tasks in this card'
      });
    }

    // Find task
    const task = card.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Verify assigned users exist if provided
    if (assignedTo) {
      const User = require('../models/User');
      const userIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

      for (const userId of userIds) {
        if (userId) {
          const user = await User.findById(userId);
          if (!user) {
            return res.status(404).json({
              success: false,
              message: `Assigned user ${userId} not found`
            });
          }
        }
      }
    }

    const updateData = {};
    if (title !== undefined && title.trim()) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedBy = req.user.id;
    }
    if (assignedTo !== undefined) {
      // Convert to array if not already
      updateData.assignedTo = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (priority !== undefined) updateData.priority = priority;

    console.log('BEFORE updateTask:', {
      taskId,
      updateData,
      assignedToInUpdate: updateData.assignedTo
    });

    await card.updateTask(taskId, updateData);

    console.log('AFTER updateTask, BEFORE save:', {
      updatedTask: card.tasks.id(taskId),
      assignedToCount: card.tasks.id(taskId)?.assignedTo?.length
    });

    await card.save();

    console.log('AFTER save:', {
      savedTask: card.tasks.id(taskId),
      assignedToCount: card.tasks.id(taskId)?.assignedTo?.length
    });

    // Check if workflow progressed (set by card.updateTask method)
    const workflowProgressed = card._workflowProgressed;
    const unlockedTasks = card._unlockedTasks || [];

    // Send Slack notifications for task assignments
    if (assignedTo !== undefined && assignedTo && assignedTo.length > 0) {
      const list = await List.findById(card.listId).populate('boardId');
      const board = list ? list.boardId : null;
      const assignedByUser = await User.findById(req.user.id).select('firstName lastName');

      if (board && assignedByUser) {
        const userIds = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

        for (const userId of userIds) {
          if (userId) {
            const assignedUser = await User.findById(userId).select('firstName lastName email');

            if (assignedUser) {
              const assignedUserName = `${assignedUser.firstName} ${assignedUser.lastName}`;
              const assignedByName = `${assignedByUser.firstName} ${assignedByUser.lastName}`;

              // Get the updated task for notification
              const updatedTaskForNotification = card.tasks.id(taskId);

              // Send Slack notification asynchronously
              slackService.notifyBoardTaskAssigned({
                taskTitle: updatedTaskForNotification.title,
                assignedTo: assignedUserName,
                assignedBy: assignedByName,
                dueDate: updatedTaskForNotification.dueDate ? updatedTaskForNotification.dueDate.toLocaleDateString() : null,
                boardName: board.name,
                cardName: card.title,
                assignedToEmail: assignedUser.email
              }).catch(error => {
                console.error('❌ Failed to send board task assignment notification:', error);
              });
            }
          }
        }
      }
    }

    // Populate assignedTo before returning
    await card.populate({
      path: 'tasks.assignedTo',
      select: 'firstName lastName avatar'
    });

    // Get the updated task
    const updatedTask = card.tasks.id(taskId);

    console.log('AFTER populate - RETURNING TO CLIENT:', {
      taskId: updatedTask._id,
      title: updatedTask.title,
      assignedTo: updatedTask.assignedTo,
      assignedToCount: updatedTask.assignedTo?.length
    });

    // Log activity for task completion
    const list = await List.findById(card.listId).select('boardId');
    if (completed !== undefined && completed !== task.completed) {
      await Activity.logActivity({
        type: completed ? 'card_task_completed' : 'card_updated',
        user: req.user.id,
        project: card.project || null,
        board: list ? list.boardId : null,
        list: card.listId,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id,
          taskTitle: task.title,
          taskId: task._id
        }
      });
    }

    // NEW: Log and notify for unlocked tasks
    if (unlockedTasks.length > 0) {
      const board = await Board.findById(list.boardId);
      const unlockedByUser = await User.findById(req.user.id).select('firstName lastName');

      for (const unlockedTask of unlockedTasks) {
        await Activity.logActivity({
          type: 'card_task_unlocked',
          user: req.user.id,
          project: card.project || null,
          board: list ? list.boardId : null,
          list: card.listId,
          card: card._id,
          metadata: {
            entityName: card.title,
            entityId: card._id,
            taskTitle: unlockedTask.title,
            taskId: unlockedTask.taskId,
            unlockedBy: task.title
          }
        });

        // Send Slack notifications for unlocked tasks
        if (board && unlockedByUser && unlockedTask.assignedTo && unlockedTask.assignedTo.length > 0) {
          const assignedUserIds = unlockedTask.assignedTo;
          const assignedUsers = await User.find({ _id: { $in: assignedUserIds } }).select('firstName lastName email');

          if (assignedUsers.length > 0) {
            const assignedUserNames = assignedUsers.map(u => `${u.firstName} ${u.lastName}`);
            const assignedUserEmails = assignedUsers.map(u => u.email);
            const unlockedBy = `${unlockedByUser.firstName} ${unlockedByUser.lastName}`;

            // Send Slack notification asynchronously
            slackService.notifyBoardTaskUnlocked({
              taskTitle: unlockedTask.title,
              assignedTo: assignedUserNames,
              boardName: board.name,
              cardName: card.title,
              unlockedBy: unlockedBy,
              assignedToEmails: assignedUserEmails
            }).catch(error => {
              console.error('❌ Failed to send board task unlocked notification:', error);
            });
          }
        }
      }

      // Emit socket event for unlocked tasks
      if (req.io) {
        req.io.to(list.boardId.toString()).emit('card:tasks:unlocked', {
          cardId: card._id,
          unlockedTasks: unlockedTasks,
          completedTask: {
            id: task._id,
            title: task.title
          }
        });
      }
    }

    // Log workflow progression if it happened
    if (workflowProgressed) {
      await Activity.logActivity({
        type: 'card_workflow_progressed',
        user: req.user.id,
        project: card.project || null,
        board: list ? list.boardId : null,
        list: card.listId,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id,
          fromStage: workflowProgressed.currentStageIndex - 1,
          toStage: workflowProgressed.currentStageIndex,
          completed: workflowProgressed.completed
        }
      });

      // Emit socket event for workflow progression
      if (req.io) {
        req.io.to(list.boardId.toString()).emit('card:workflow:progress', {
          cardId: card._id,
          fromStage: workflowProgressed.currentStageIndex - 1,
          toStage: workflowProgressed.currentStageIndex,
          completed: workflowProgressed.completed,
          card: card
        });
      }
    }

    // Emit socket event for task update
    if (req.io && list && list.boardId) {
      req.io.to(`board:${list.boardId.toString()}`).emit('task:updated', {
        cardId: card._id,
        taskId: taskId,
        task: updatedTask,
        updatedBy: {
          id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName
        },
        unlockedTasks: unlockedTasks,
        workflowProgressed: workflowProgressed || null
      });
    }

    // Build success message
    let successMessage = 'Task updated successfully';
    if (completed && unlockedTasks.length > 0) {
      successMessage = `Task completed! ${unlockedTasks.length} dependent task${unlockedTasks.length > 1 ? 's' : ''} unlocked.`;
    } else if (workflowProgressed) {
      successMessage = workflowProgressed.completed
        ? 'Task completed! Card workflow completed and moved to Done.'
        : 'Task completed! Card auto-progressed to next stage.';
    } else if (completed) {
      successMessage = 'Task completed successfully!';
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: successMessage,
      unlockedTasks: unlockedTasks,
      workflowProgressed: workflowProgressed || null
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId/tasks/:taskId
 * @desc    Delete task from card
 * @access  Private
 */
router.delete('/:cardId/tasks/:taskId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { taskId } = req.params;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete tasks from this card'
      });
    }

    // Find task
    const task = card.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const taskTitle = task.title;
    card.deleteTask(taskId);
    await card.save();

    // Log activity for task deletion
    const list = await List.findById(card.listId).select('boardId');
    await Activity.logActivity({
      type: 'card_task_deleted',
      user: req.user.id,
      project: card.project || null,
      board: list ? list.boardId : null,
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        taskTitle: taskTitle
      }
    });

    // Emit socket event for task deletion
    if (req.io && list && list.boardId) {
      req.io.to(`board:${list.boardId.toString()}`).emit('task:deleted', {
        cardId: card._id,
        taskId: taskId,
        deletedBy: {
          id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/tasks/:taskId/reorder
 * @desc    Reorder task position within card
 * @access  Private
 */
router.put('/:cardId/tasks/:taskId/reorder', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { taskId } = req.params;
    const { newPosition } = req.body;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reorder tasks in this card'
      });
    }

    if (typeof newPosition !== 'number' || newPosition < 0) {
      return res.status(400).json({
        success: false,
        message: 'New position must be a valid number'
      });
    }

    card.reorderTask(taskId, newPosition);
    await card.save();

    res.status(200).json({
      success: true,
      message: 'Task reordered successfully'
    });
  } catch (error) {
    console.error('Reorder task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering task'
    });
  }
});

// ====== SUBTASK MANAGEMENT APIS ======

/**
 * @route   POST /api/cards/:cardId/tasks/:taskId/subtasks
 * @desc    Add subtask to task
 * @access  Private
 */
router.post('/:cardId/tasks/:taskId/subtasks', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { taskId } = req.params;
    const { title } = req.body;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add subtasks to this card'
      });
    }

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subtask title is required'
      });
    }

    // Find task
    const task = card.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const subtaskData = {
      title: title.trim()
    };

    const addedSubtask = await card.addSubtask(taskId, subtaskData);
    await card.save();

    console.log('Added subtask debug:', {
      subtaskData,
      addedSubtask: {
        _id: addedSubtask._id,
        title: addedSubtask.title,
        completed: addedSubtask.completed
      },
      cardId: card._id,
      taskId: taskId
    });

    // Log activity for subtask creation
    const list = await List.findById(card.listId).select('boardId');
    await Activity.logActivity({
      type: 'card_subtask_added',
      user: req.user.id,
      project: card.project || null,
      board: list ? list.boardId : null,
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        taskTitle: task.title,
        taskId: task._id,
        subtaskTitle: addedSubtask.title,
        subtaskId: addedSubtask._id
      }
    });

    res.status(201).json({
      success: true,
      data: addedSubtask,
      message: 'Subtask added successfully'
    });
  } catch (error) {
    console.error('Add subtask error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding subtask'
    });
  }
});

/**
 * @route   PUT /api/cards/:cardId/tasks/:taskId/subtasks/:subtaskId
 * @desc    Update subtask in task
 * @access  Private
 */
router.put('/:cardId/tasks/:taskId/subtasks/:subtaskId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { taskId, subtaskId } = req.params;
    const { title, completed } = req.body;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update subtasks in this card'
      });
    }

    // Find task
    const task = card.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Find subtask
    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found'
      });
    }

    const updateData = {};
    if (title !== undefined && title.trim()) updateData.title = title.trim();
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedBy = req.user.id;
    }

    const updatedSubtask = await card.updateSubtask(taskId, subtaskId, updateData);
    await card.save();

    // Log activity for subtask update
    const list = await List.findById(card.listId).select('boardId');
    if (completed !== undefined && completed !== subtask.completed) {
      await Activity.logActivity({
        type: completed ? 'card_subtask_completed' : 'card_subtask_updated',
        user: req.user.id,
        project: card.project || null,
        board: list ? list.boardId : null,
        list: card.listId,
        card: card._id,
        metadata: {
          entityName: card.title,
          entityId: card._id,
          taskTitle: task.title,
          taskId: task._id,
          subtaskTitle: subtask.title,
          subtaskId: subtask._id
        }
      });
    }

    res.status(200).json({
      success: true,
      data: updatedSubtask,
      message: 'Subtask updated successfully'
    });
  } catch (error) {
    console.error('Update subtask error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subtask'
    });
  }
});

/**
 * @route   DELETE /api/cards/:cardId/tasks/:taskId/subtasks/:subtaskId
 * @desc    Delete subtask from task
 * @access  Private
 */
router.delete('/:cardId/tasks/:taskId/subtasks/:subtaskId', protect, getCardWithAccess, async (req, res) => {
  try {
    const card = req.card;
    const { taskId, subtaskId } = req.params;

    // Check permission
    const hasPermission = await card.hasPermission(req.user.id, 'write', req.user.role);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete subtasks from this card'
      });
    }

    // Find task
    const task = card.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Find subtask
    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found'
      });
    }

    const subtaskTitle = subtask.title;
    await card.deleteSubtask(taskId, subtaskId);
    await card.save();

    // Log activity for subtask deletion
    const list = await List.findById(card.listId).select('boardId');
    await Activity.logActivity({
      type: 'card_subtask_deleted',
      user: req.user.id,
      project: card.project || null,
      board: list ? list.boardId : null,
      list: card.listId,
      card: card._id,
      metadata: {
        entityName: card.title,
        entityId: card._id,
        taskTitle: task.title,
        taskId: task._id,
        subtaskTitle: subtaskTitle
      }
    });

    res.status(200).json({
      success: true,
      message: 'Subtask deleted successfully'
    });
  } catch (error) {
    console.error('Delete subtask error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subtask'
    });
  }
});

// Upload cover image for card
router.post('/upload-cover', protect, async (req, res) => {
  const { uploadImage } = require('../config/cloudinary');

  uploadImage.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading image'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    try {
      res.status(200).json({
        success: true,
        data: {
          url: req.file.path,
          publicId: req.file.filename
        },
        message: 'Cover image uploaded successfully'
      });
    } catch (error) {
      console.error('Upload response error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing upload'
      });
    }
  });
});

module.exports = router;