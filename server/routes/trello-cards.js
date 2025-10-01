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

    // Update fields
    if (title && title.trim()) card.title = title.trim();
    if (description !== undefined) card.description = description;
    if (coverImage !== undefined) card.coverImage = coverImage;
    if (color !== undefined) card.color = color;
    if (labels) card.labels = labels;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (startDate !== undefined) card.startDate = startDate;
    if (budget !== undefined) card.budget = budget;
    if (category !== undefined) card.category = category;
    if (priority !== undefined) card.priority = priority;
    if (status !== undefined) card.status = status;
    if (progress !== undefined) card.progress = progress;
    if (estimatedHours !== undefined) {
      if (!card.timeTracking) card.timeTracking = {};
      card.timeTracking.estimated = estimatedHours;
    }
    if (actualHours !== undefined) {
      if (!card.timeTracking) card.timeTracking = {};
      card.timeTracking.spent = actualHours;
    }

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
    const { title, description, assignedTo, priority = 'medium' } = req.body;

    console.log('ADD TASK DEBUG:', {
      cardId: req.params.cardId,
      taskData: { title, description, assignedTo, priority }
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

    // Verify assigned user exists if provided
    if (assignedTo) {
      const User = require('../models/User');
      const user = await User.findById(assignedTo);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
    }

    const taskData = {
      title: title.trim(),
      description: description || '',
      assignedTo: assignedTo || null,
      priority: priority
    };

    card.addTask(taskData, req.user.id);
    await card.save();

    // Get the newly added task (it will be the last one)
    const addedTask = card.tasks[card.tasks.length - 1];

    console.log('ADDED TASK RESULT:', {
      taskId: addedTask._id,
      taskTitle: addedTask.title,
      totalTasks: card.tasks.length
    });

    // Get the board and project info for activity logging
    const list = await List.findById(card.listId);
    const board = await Board.findById(list.boardId).populate('project');

    // Create activity (only if board has a project)
    if (board.project) {
      await Activity.create({
        type: 'card_checklist_items_added',
        user: req.user.id,
        project: board.project._id,
        board: board._id,
        card: card._id,
        data: { taskId: addedTask._id, taskTitle: addedTask.title }
      });
    }

    res.status(201).json({
      success: true,
      data: addedTask,
      message: 'Task added successfully'
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
    const { title, description, completed, assignedTo, priority } = req.body;

    console.log('UPDATE TASK DEBUG:', {
      cardId: req.params.cardId,
      taskId: taskId,
      updateData: { title, description, completed, assignedTo, priority }
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
    if (completed !== undefined) updateData.completed = completed;
    if (assignedTo !== undefined) {
      // Convert to array if not already
      updateData.assignedTo = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
    }
    if (priority !== undefined) updateData.priority = priority;

    card.updateTask(taskId, updateData);
    await card.save();

    // Populate assignedTo before returning
    await card.populate({
      path: 'tasks.assignedTo',
      select: 'firstName lastName avatar'
    });

    // Get the updated task
    const updatedTask = card.tasks.id(taskId);

    // Create activity for task completion
    if (completed !== undefined && completed !== task.completed) {
      // Get the board and project info for activity logging
      const list = await List.findById(card.listId);
      const board = await Board.findById(list.boardId).populate('project');

      // Create activity (only if board has a project)
      if (board.project) {
        await Activity.create({
          type: completed ? 'card_checklist_item_completed' : 'card_updated',
          user: req.user.id,
          project: board.project._id,
          board: board._id,
          card: card._id,
          data: { taskId: task._id, taskTitle: task.title }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
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

    // Get the board and project info for activity logging
    const list = await List.findById(card.listId);
    const board = await Board.findById(list.boardId).populate('project');

    // Create activity (only if board has a project)
    if (board.project) {
      await Activity.create({
        type: 'card_updated',
        user: req.user.id,
        project: board.project._id,
        board: board._id,
        card: card._id,
        data: { taskTitle: taskTitle }
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