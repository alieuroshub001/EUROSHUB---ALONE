const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userManagementController');

const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createUserValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .isIn(['superadmin', 'admin', 'hr', 'employee', 'client'])
    .withMessage('Please provide a valid role'),
  body('employeeId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Employee ID cannot be more than 20 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('Phone number cannot be more than 15 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot be more than 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position cannot be more than 100 characters')
];

const updateUserValidation = [
  body('id')
    .isMongoId()
    .withMessage('Please provide a valid user ID'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['superadmin', 'admin', 'hr', 'employee', 'client'])
    .withMessage('Please provide a valid role'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 15 })
    .withMessage('Phone number cannot be more than 15 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot be more than 100 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position cannot be more than 100 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Routes

/**
 * @route   GET /api/user-management/users
 * @desc    Get all users based on current user permissions
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/users',
  protect,
  authorize('superadmin', 'admin', 'hr'),
  getUsers
);

/**
 * @route   POST /api/user-management/users
 * @desc    Create a new user
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/users',
  protect,
  authorize('superadmin', 'admin', 'hr'),
  createUserValidation,
  createUser
);

/**
 * @route   PUT /api/user-management/users
 * @desc    Update an existing user
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/users',
  protect,
  authorize('superadmin', 'admin', 'hr'),
  updateUserValidation,
  updateUser
);

/**
 * @route   DELETE /api/user-management/users
 * @desc    Delete a user
 * @access  Private (Admin, Superadmin)
 */
router.delete('/users',
  protect,
  authorize('superadmin', 'admin'),
  deleteUser
);

/**
 * @route   GET /api/user-management/stats
 * @desc    Get user statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats',
  protect,
  authorize('superadmin', 'admin', 'hr'),
  getUserStats
);

module.exports = router;