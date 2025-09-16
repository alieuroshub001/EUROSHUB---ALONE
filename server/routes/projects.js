const express = require('express');
const router = express.Router();
const { body, validationResult, param, query } = require('express-validator');
const Project = require('../models/Project');
const Board = require('../models/Board');
const Activity = require('../models/Activity');
const { protect: auth } = require('../middleware/auth');

// Get user's projects with pagination and filters
router.get('/',
  auth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('status').optional().isIn(['active', 'completed', 'on-hold', 'cancelled']).withMessage('Invalid status'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters')
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

    // Build query
    let query = {};

    // User can see projects they own or are members of
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      // Admins can see all projects
    } else {
      query.$or = [
        { owner: req.user._id },
        { 'members.user': req.user._id },
        { 'settings.isPrivate': false }
      ];
    }

    // Apply filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { tags: { $in: [new RegExp(req.query.search, 'i')] } }
        ]
      });
    }

    query.isArchived = false;

    const projects = await Project.find(query)
      .populate('owner', 'firstName lastName avatar')
      .populate('members.user', 'firstName lastName avatar')
      .populate('boards', 'name')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalProjects = await Project.countDocuments(query);
    const totalPages = Math.ceil(totalProjects / limit);

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          currentPage: page,
          totalPages,
          totalProjects,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects'
    });
  }
});

// Get single project by ID
router.get('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid project ID')
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

    const project = await Project.findById(req.params.id)
      .populate('owner', 'firstName lastName avatar email')
      .populate('members.user', 'firstName lastName avatar email role')
      .populate({
        path: 'boards',
        populate: {
          path: 'lists',
          populate: {
            path: 'cards',
            populate: {
              path: 'assignedMembers',
              select: 'firstName lastName avatar'
            }
          }
        }
      })
      .populate('createdBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    if (!project.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: { project }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve project'
    });
  }
});

// Create new project
router.post('/',
  auth,
  [
    body('name').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be between 1 and 100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
    body('members').optional().isArray().withMessage('Members must be an array'),
    body('members.*.user').optional().isMongoId().withMessage('Invalid user ID'),
    body('members.*.role').optional().isIn(['owner', 'admin', 'member', 'viewer']).withMessage('Invalid member role'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isLength({ min: 1, max: 30 }).withMessage('Each tag must be between 1 and 30 characters'),
    body('settings.isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean'),
    body('settings.allowComments').optional().isBoolean().withMessage('allowComments must be boolean'),
    body('settings.allowFileAttachments').optional().isBoolean().withMessage('allowFileAttachments must be boolean')
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

    const projectData = {
      ...req.body,
      owner: req.user._id,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'owner',
          joinedAt: new Date()
        }
      ]
    };

    // Add additional members if provided
    if (req.body.members && req.body.members.length > 0) {
      for (const member of req.body.members) {
        if (member.user !== req.user._id.toString()) {
          projectData.members.push({
            user: member.user,
            role: member.role || 'member',
            joinedAt: new Date()
          });
        }
      }
    }

    const project = new Project(projectData);
    await project.save();

    // Create activity log
    await Activity.createActivity(
      'project_created',
      req.user._id,
      { project: project._id },
      {
        newValue: project.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Populate response
    await project.populate('owner', 'firstName lastName avatar');
    await project.populate('members.user', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Create project error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A project with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

// Update project
router.put('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be between 1 and 100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('status').optional().isIn(['active', 'completed', 'on-hold', 'cancelled']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
    body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('tags.*').optional().isLength({ min: 1, max: 30 }).withMessage('Each tag must be between 1 and 30 characters')
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

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const userRole = project.getMemberRole(req.user._id);
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' &&
        project.owner.toString() !== req.user._id.toString() &&
        userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('owner', 'firstName lastName avatar')
    .populate('members.user', 'firstName lastName avatar');

    // Create activity log
    await Activity.createActivity(
      'project_updated',
      req.user._id,
      { project: project._id },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

// Add member to project
router.post('/:id/members',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('role').optional().isIn(['admin', 'member', 'viewer']).withMessage('Invalid role')
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

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const userRole = project.getMemberRole(req.user._id);
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' &&
        project.owner.toString() !== req.user._id.toString() &&
        userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await project.addMember(req.body.userId, req.body.role || 'member');

    // Create activity log
    const User = require('../models/User');
    const targetUser = await User.findById(req.body.userId);

    await Activity.createActivity(
      'project_member_added',
      req.user._id,
      { project: project._id },
      {
        targetUser: targetUser._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await project.populate('members.user', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add member'
    });
  }
});

// Remove member from project
router.delete('/:id/members/:userId',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
    param('userId').isMongoId().withMessage('Invalid user ID')
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

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const userRole = project.getMemberRole(req.user._id);
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' &&
        project.owner.toString() !== req.user._id.toString() &&
        userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Can't remove project owner
    if (project.owner.toString() === req.params.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove project owner'
      });
    }

    await project.removeMember(req.params.userId);

    // Create activity log
    const User = require('../models/User');
    const targetUser = await User.findById(req.params.userId);

    await Activity.createActivity(
      'project_member_removed',
      req.user._id,
      { project: project._id },
      {
        targetUser: targetUser._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    await project.populate('members.user', 'firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: { project }
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member'
    });
  }
});

// Archive project
router.patch('/:id/archive',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid project ID')
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

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' &&
        project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    project.isArchived = true;
    project.archivedAt = new Date();
    await project.save();

    // Create activity log
    await Activity.createActivity(
      'project_archived',
      req.user._id,
      { project: project._id },
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    res.status(200).json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    console.error('Archive project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive project'
    });
  }
});

// Get project activity
router.get('/:id/activity',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid project ID'),
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

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    if (!project.canUserAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const activities = await Activity.getProjectActivity(req.params.id, limit, page);

    res.status(200).json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    console.error('Get project activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve project activity'
    });
  }
});

module.exports = router;