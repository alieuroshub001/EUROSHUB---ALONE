const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Project = require('../models/Project');
const User = require('../models/User');
const Activity = require('../models/Activity');
const automationService = require('../services/automationService');
const { protect } = require('../middleware/auth');
const {
  checkProjectAccess,
  checkProjectPermission,
  checkProjectCreatePermission,
  checkMemberManagementPermission,
  validateMemberRole,
  getUserProjectRole
} = require('../middleware/projectAuth');

/**
 * @route   GET /api/projects
 * @desc    Get user's projects
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, priority, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    // Build query based on user role
    let query = {};

    if (['superadmin', 'admin'].includes(userRole)) {
      // Superadmin and admin can see all projects
      query = { isArchived: false };
    } else if (userRole === 'hr') {
      // HR can see all projects for resource planning and team management
      query = { isArchived: false };
    } else {
      // Employees and clients can only see projects they own or are members of
      query = {
        $or: [
          { owner: userId },
          { 'members.user': userId },
          { client: userId } // Clients can see projects where they are the client
        ],
        isArchived: false
      };
    }

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortDirection };

    // Get projects
    const projects = await Project.find(query)
      .populate({
        path: 'owner',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      })
      .populate({
        path: 'client',
        select: 'firstName lastName email',
        match: { _id: { $ne: null } }
      })
      .populate({
        path: 'members.user',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      })
      .populate({
        path: 'members.addedBy',
        select: 'firstName lastName',
        match: { _id: { $ne: null } }
      })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip(skip);

    // Get total count for pagination
    const total = await Project.countDocuments(query);

    // Add user's role in each project
    const projectsWithUserRole = projects.map(project => {
      const projectObj = project.toObject();
      projectObj.userRole = getUserProjectRole(project, userId);
      return projectObj;
    });

    res.status(200).json({
      success: true,
      data: projectsWithUserRole,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching projects'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId
 * @desc    Get project details
 * @access  Private
 */
router.get('/:projectId', protect, checkProjectAccess, async (req, res) => {
  try {
    const project = req.project;
    const userId = req.user.id;

    // Populate project details
    await project.populate([
      {
        path: 'owner',
        select: 'firstName lastName avatar email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'client',
        select: 'firstName lastName email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'members.user',
        select: 'firstName lastName avatar email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'members.addedBy',
        select: 'firstName lastName',
        match: { _id: { $ne: null } }
      }
    ]);

    const projectObj = project.toObject();
    projectObj.userRole = getUserProjectRole(project, userId);

    res.status(200).json({
      success: true,
      data: projectObj
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project'
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
router.post('/', protect, checkProjectCreatePermission, async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      priority,
      budget,
      client,
      tags,
      visibility,
      estimatedHours
    } = req.body;

    // Validation
    if (!title || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Title and start date are required'
      });
    }

    // Validate client if provided
    if (client) {
      const clientUser = await User.findById(client);
      if (!clientUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid client ID'
        });
      }
    }

    // Create project
    const project = new Project({
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      priority: priority || 'medium',
      budget: budget || { amount: 0, currency: 'USD' },
      client,
      owner: req.user.id,
      tags: tags || [],
      visibility: visibility || 'team',
      estimatedHours: estimatedHours || 0
    });

    // Add creator as a project manager member
    project.members.push({
      user: req.user.id,
      role: 'project_manager',
      addedBy: req.user.id,
      joinedAt: new Date()
    });

    await project.save();

    // Log activity
    await Activity.logActivity({
      type: 'project_created',
      user: req.user.id,
      project: project._id,
      metadata: {
        entityName: project.title,
        entityId: project._id
      }
    });

    // Populate for response with members
    await project.populate([
      {
        path: 'owner',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'client',
        select: 'firstName lastName email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'members.user',
        select: 'firstName lastName avatar email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'members.addedBy',
        select: 'firstName lastName',
        match: { _id: { $ne: null } }
      }
    ]);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating project'
    });
  }
});

/**
 * @route   PUT /api/projects/:projectId
 * @desc    Update project
 * @access  Private
 */
router.put('/:projectId', protect, checkProjectAccess, checkProjectPermission('write'), async (req, res) => {
  try {
    const project = req.project;
    const {
      title,
      description,
      startDate,
      endDate,
      priority,
      status,
      budget,
      client,
      tags,
      visibility,
      estimatedHours
    } = req.body;

    // Track changes for activity log
    const changes = [];
    const oldValues = {};

    // Update fields if provided
    if (title && title !== project.title) {
      oldValues.title = project.title;
      project.title = title;
      changes.push({ field: 'title', oldValue: oldValues.title, newValue: title });
    }

    if (description !== undefined && description !== project.description) {
      oldValues.description = project.description;
      project.description = description;
      changes.push({ field: 'description', oldValue: oldValues.description, newValue: description });
    }

    if (startDate && new Date(startDate).getTime() !== project.startDate.getTime()) {
      oldValues.startDate = project.startDate;
      project.startDate = new Date(startDate);
      changes.push({ field: 'startDate', oldValue: oldValues.startDate, newValue: project.startDate });
    }

    if (endDate !== undefined) {
      const newEndDate = endDate ? new Date(endDate) : null;
      if ((newEndDate && !project.endDate) || (!newEndDate && project.endDate) ||
          (newEndDate && project.endDate && newEndDate.getTime() !== project.endDate.getTime())) {
        oldValues.endDate = project.endDate;
        project.endDate = newEndDate;
        changes.push({ field: 'endDate', oldValue: oldValues.endDate, newValue: newEndDate });
      }
    }

    if (priority && priority !== project.priority) {
      oldValues.priority = project.priority;
      project.priority = priority;
      changes.push({ field: 'priority', oldValue: oldValues.priority, newValue: priority });
    }

    if (status && status !== project.status) {
      oldValues.status = project.status;
      project.status = status;
      changes.push({ field: 'status', oldValue: oldValues.status, newValue: status });
    }

    if (budget) {
      if (budget.amount !== undefined && budget.amount !== project.budget.amount) {
        oldValues.budgetAmount = project.budget.amount;
        project.budget.amount = budget.amount;
        changes.push({ field: 'budget.amount', oldValue: oldValues.budgetAmount, newValue: budget.amount });
      }
      if (budget.currency && budget.currency !== project.budget.currency) {
        oldValues.budgetCurrency = project.budget.currency;
        project.budget.currency = budget.currency;
        changes.push({ field: 'budget.currency', oldValue: oldValues.budgetCurrency, newValue: budget.currency });
      }
    }

    if (client !== undefined && client !== project.client?.toString()) {
      oldValues.client = project.client;
      project.client = client || null;
      changes.push({ field: 'client', oldValue: oldValues.client, newValue: client });
    }

    if (tags && JSON.stringify(tags) !== JSON.stringify(project.tags)) {
      oldValues.tags = [...project.tags];
      project.tags = tags;
      changes.push({ field: 'tags', oldValue: oldValues.tags, newValue: tags });
    }

    if (visibility && visibility !== project.visibility) {
      oldValues.visibility = project.visibility;
      project.visibility = visibility;
      changes.push({ field: 'visibility', oldValue: oldValues.visibility, newValue: visibility });
    }

    if (estimatedHours !== undefined && estimatedHours !== project.estimatedHours) {
      oldValues.estimatedHours = project.estimatedHours;
      project.estimatedHours = estimatedHours;
      changes.push({ field: 'estimatedHours', oldValue: oldValues.estimatedHours, newValue: estimatedHours });
    }

    // Save project
    await project.save();

    // Log activity if there were changes
    if (changes.length > 0) {
      await Activity.logActivity({
        type: 'project_updated',
        user: req.user.id,
        project: project._id,
        metadata: {
          entityName: project.title,
          entityId: project._id,
          changes
        }
      });
    }

    // Populate for response
    await project.populate([
      {
        path: 'owner',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      },
      {
        path: 'client',
        select: 'firstName lastName email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'members.user',
        select: 'firstName lastName avatar',
        match: { _id: { $ne: null } }
      }
    ]);

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating project'
    });
  }
});

/**
 * @route   DELETE /api/projects/:projectId
 * @desc    Delete project
 * @access  Private
 */
router.delete('/:projectId', protect, checkProjectAccess, checkProjectPermission('delete'), async (req, res) => {
  try {
    const project = req.project;
    const projectTitle = project.title;

    // Log activity before deletion
    await Activity.logActivity({
      type: 'project_deleted',
      user: req.user.id,
      project: project._id,
      metadata: {
        entityName: projectTitle,
        entityId: project._id
      }
    });

    // Delete project (this will trigger pre-remove middleware to clean up boards, lists, cards)
    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting project'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/members
 * @desc    Get project members
 * @access  Private
 */
router.get('/:projectId/members', protect, checkProjectAccess, async (req, res) => {
  try {
    const project = req.project;

    // Populate members
    await project.populate([
      {
        path: 'members.user',
        select: 'firstName lastName avatar email',
        match: { _id: { $ne: null } }
      },
      {
        path: 'members.addedBy',
        select: 'firstName lastName',
        match: { _id: { $ne: null } }
      },
      {
        path: 'owner',
        select: 'firstName lastName avatar email',
        match: { _id: { $ne: null } }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        members: project.members,
        owner: project.owner
      }
    });
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project members'
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/members
 * @desc    Add member to project
 * @access  Private
 */
router.post('/:projectId/members', protect, checkProjectAccess, checkMemberManagementPermission, validateMemberRole, async (req, res) => {
  try {
    const project = req.project;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add member to project
    try {
      project.addMember(userId, role, req.user.id, req.user.role);
      await project.save();

      // Log activity
      await Activity.logActivity({
        type: 'project_member_added',
        user: req.user.id,
        project: project._id,
        targetUser: userId,
        data: {
          newValue: role,
          projectTitle: project.title // Include project title directly
        },
        metadata: {
          entityName: project.title,
          entityId: project._id
        }
      });

      // Populate for response
      await project.populate([
        {
          path: 'members.user',
          select: 'firstName lastName avatar email',
          match: { _id: { $ne: null } }
        },
        {
          path: 'members.addedBy',
          select: 'firstName lastName',
          match: { _id: { $ne: null } }
        }
      ]);

      // Trigger automation for member addition
      automationService.handleProjectMemberAdded(
        project._id,
        userId,
        req.user.id,
        role
      ).catch(error => {
        console.error('Automation error for member addition:', error);
      });

      res.status(200).json({
        success: true,
        data: project.members,
        message: 'Member added successfully'
      });
    } catch (addError) {
      return res.status(400).json({
        success: false,
        message: addError.message
      });
    }
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding member to project'
    });
  }
});

/**
 * @route   PUT /api/projects/:projectId/members/:memberId
 * @desc    Update member role
 * @access  Private
 */
router.put('/:projectId/members/:memberId', protect, checkProjectAccess, checkMemberManagementPermission, validateMemberRole, async (req, res) => {
  try {
    const project = req.project;
    const { memberId } = req.params;
    const { role } = req.body;

    // Update member role
    try {
      const oldMember = project.members.find(m => m.user.toString() === memberId);
      const oldRole = oldMember ? oldMember.role : null;

      project.updateMemberRole(memberId, role, req.user.role);
      await project.save();

      // Log activity
      await Activity.logActivity({
        type: 'project_member_role_changed',
        user: req.user.id,
        project: project._id,
        targetUser: memberId,
        data: {
          oldValue: oldRole,
          newValue: role,
          projectTitle: project.title // Include project title directly
        },
        metadata: {
          entityName: project.title,
          entityId: project._id
        }
      });

      // Populate for response
      await project.populate([
        {
          path: 'members.user',
          select: 'firstName lastName avatar email',
          match: { _id: { $ne: null } }
        },
        {
          path: 'members.addedBy',
          select: 'firstName lastName',
          match: { _id: { $ne: null } }
        }
      ]);

      res.status(200).json({
        success: true,
        data: project.members,
        message: 'Member role updated successfully'
      });
    } catch (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message
      });
    }
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating member role'
    });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/members/:memberId
 * @desc    Remove member from project
 * @access  Private
 */
router.delete('/:projectId/members/:memberId', protect, checkProjectAccess, checkMemberManagementPermission, async (req, res) => {
  try {
    const project = req.project;
    const { memberId } = req.params;

    // Remove member from project
    try {
      project.removeMember(memberId, req.user.role);
      await project.save();

      // Log activity
      await Activity.logActivity({
        type: 'project_member_removed',
        user: req.user.id,
        project: project._id,
        targetUser: memberId,
        metadata: {
          entityName: project.title,
          entityId: project._id
        }
      });

      // Populate for response
      await project.populate([
        {
          path: 'members.user',
          select: 'firstName lastName avatar email',
          match: { _id: { $ne: null } }
        },
        {
          path: 'members.addedBy',
          select: 'firstName lastName',
          match: { _id: { $ne: null } }
        }
      ]);

      res.status(200).json({
        success: true,
        data: project.members,
        message: 'Member removed successfully'
      });
    } catch (removeError) {
      return res.status(400).json({
        success: false,
        message: removeError.message
      });
    }
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member from project'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/activities
 * @desc    Get project activities
 * @access  Private
 */
router.get('/:projectId/activities', protect, checkProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, skip = 0, types = [] } = req.query;

    const activities = await Activity.getProjectActivities(
      projectId,
      req.user.id,
      req.user.role,
      {
        limit: parseInt(limit),
        skip: parseInt(skip),
        types: types.length > 0 ? types.split(',') : []
      }
    );

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get project activities error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching project activities'
    });
  }
});

/**
 * @route   PUT /api/projects/:projectId/archive
 * @desc    Archive/unarchive project
 * @access  Private
 */
router.put('/:projectId/archive', protect, checkProjectAccess, checkProjectPermission('delete'), async (req, res) => {
  try {
    const project = req.project;
    const { archive = true } = req.body;

    project.isArchived = archive;
    await project.save();

    // Log activity
    await Activity.logActivity({
      type: 'project_archived',
      user: req.user.id,
      project: project._id,
      data: {
        newValue: archive
      },
      metadata: {
        entityName: project.title,
        entityId: project._id
      }
    });

    res.status(200).json({
      success: true,
      data: project,
      message: `Project ${archive ? 'archived' : 'unarchived'} successfully`
    });
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving project'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/boards
 * @desc    Get project boards
 * @access  Private
 */
router.get('/:projectId/boards', protect, checkProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeArchived = false } = req.query;

    const Board = require('../models/Board');

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
            }
          ]
        }
      })
      .sort({ position: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: boards
    });
  } catch (error) {
    console.error('Get project boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching project boards'
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/boards
 * @desc    Create new board for project
 * @access  Private
 */
router.post('/:projectId/boards', protect, checkProjectAccess, checkProjectPermission('write'), async (req, res) => {
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

    const Board = require('../models/Board');
    const List = require('../models/List');
    const Activity = require('../models/Activity');

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

    res.status(201).json({
      success: true,
      data: board,
      message: 'Board created successfully'
    });
  } catch (error) {
    console.error('Create project board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating board'
    });
  }
});

module.exports = router;