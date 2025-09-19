const Project = require('../models/Project');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');

/**
 * Middleware to check if user can access a project
 */
const checkProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Superadmin and admin have access to all projects
    if (['superadmin', 'admin'].includes(userRole)) {
      req.project = project;
      return next();
    }

    // Check if user is project owner
    if (project.owner.toString() === userId.toString()) {
      req.project = project;
      return next();
    }

    // Check if user is project member
    const isMember = project.members.some(member => member.user.toString() === userId.toString());
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project'
      });
    }

    req.project = project;
    next();
  } catch (error) {
    console.error('Project access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking project access'
    });
  }
};

/**
 * Middleware to check if user can perform specific action on project
 */
const checkProjectPermission = (requiredAction) => {
  return async (req, res, next) => {
    try {
      const project = req.project;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!project) {
        return res.status(400).json({
          success: false,
          message: 'Project context is required'
        });
      }

      // Superadmin and admin have all permissions
      if (['superadmin', 'admin'].includes(userRole)) {
        return next();
      }

      // Check if user has required permission
      const hasPermission = project.hasPermission(userId, requiredAction);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to ${requiredAction}`
        });
      }

      next();
    } catch (error) {
      console.error('Project permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking project permissions'
      });
    }
  };
};

/**
 * Middleware to check if user can access a board
 */
const checkBoardAccess = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!boardId) {
      return res.status(400).json({
        success: false,
        message: 'Board ID is required'
      });
    }

    // Find the board and populate project
    const board = await Board.findById(boardId).populate('project');
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Check project access first
    const hasAccess = await board.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project'
      });
    }

    req.board = board;
    req.project = board.project;
    next();
  } catch (error) {
    console.error('Board access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking board access'
    });
  }
};

/**
 * Middleware to check if user can access a list
 */
const checkListAccess = async (req, res, next) => {
  try {
    const { listId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!listId) {
      return res.status(400).json({
        success: false,
        message: 'List ID is required'
      });
    }

    // Find the list and populate board and project
    const list = await List.findById(listId).populate({
      path: 'board',
      populate: {
        path: 'project'
      }
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'List not found'
      });
    }

    // Check project access
    const hasAccess = await list.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project'
      });
    }

    req.list = list;
    req.board = list.board;
    req.project = list.board.project;
    next();
  } catch (error) {
    console.error('List access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking list access'
    });
  }
};

/**
 * Middleware to check if user can access a card
 */
const checkCardAccess = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'Card ID is required'
      });
    }

    // Find the card and populate list, board, and project
    const card = await Card.findById(cardId).populate({
      path: 'list',
      populate: {
        path: 'board',
        populate: {
          path: 'project'
        }
      }
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check project access
    const hasAccess = await card.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project'
      });
    }

    req.card = card;
    req.list = card.list;
    req.board = card.list.board;
    req.project = card.list.board.project;
    next();
  } catch (error) {
    console.error('Card access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking card access'
    });
  }
};

/**
 * Middleware to check if user can create projects
 */
const checkProjectCreatePermission = (req, res, next) => {
  const userRole = req.user.role;

  if (!Project.canUserCreate(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to create projects'
    });
  }

  next();
};

/**
 * Middleware to check if user can manage project members
 */
const checkMemberManagementPermission = async (req, res, next) => {
  try {
    const project = req.project;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Project context is required'
      });
    }

    // Superadmin and admin can manage all members
    if (['superadmin', 'admin'].includes(userRole)) {
      return next();
    }

    // Project owner can manage members
    if (project.owner.toString() === userId.toString()) {
      return next();
    }

    // Project managers can manage some members
    const userMember = project.members.find(m => m.user.toString() === userId.toString());
    if (userMember && userMember.role === 'project_manager') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to manage project members'
    });
  } catch (error) {
    console.error('Member management permission check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking member management permissions'
    });
  }
};

/**
 * Middleware to validate user role for member addition
 */
const validateMemberRole = (req, res, next) => {
  const { role } = req.body;
  const userRole = req.user.role;

  const validRoles = ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'];

  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Valid role is required',
      validRoles
    });
  }

  // Check if user can assign this role
  const canAssignRole = {
    'superadmin': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    'admin': ['project_manager', 'developer', 'designer', 'tester', 'viewer', 'client_viewer'],
    'hr': ['developer', 'designer', 'tester', 'viewer'],
    'project_manager': ['developer', 'designer', 'tester', 'viewer', 'client_viewer']
  };

  if (!canAssignRole[userRole]?.includes(role)) {
    return res.status(403).json({
      success: false,
      message: `You cannot assign the role '${role}'`
    });
  }

  next();
};

/**
 * Helper function to get user's project role
 */
const getUserProjectRole = (project, userId) => {
  // Check if owner exists and matches user
  if (project.owner && project.owner.toString() === userId.toString()) {
    return 'owner';
  }

  // Check members array with null safety
  if (!project.members || !Array.isArray(project.members)) {
    return null;
  }

  const member = project.members.find(m =>
    m && m.user && m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

module.exports = {
  checkProjectAccess,
  checkProjectPermission,
  checkBoardAccess,
  checkListAccess,
  checkCardAccess,
  checkProjectCreatePermission,
  checkMemberManagementPermission,
  validateMemberRole,
  getUserProjectRole
};