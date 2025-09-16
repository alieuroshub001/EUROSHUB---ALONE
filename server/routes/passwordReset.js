const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');
const { protect } = require('../middleware/auth');

// Validation middlewares
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const validateProcessRequest = [
  body('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either "approve" or "reject"'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Public routes
/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/request-password-reset', validatePasswordResetRequest, passwordResetController.requestPasswordReset);

// Protected routes (admin only)
/**
 * @route   GET /api/password-reset/pending
 * @desc    Get pending password reset requests
 * @access  Private (Admin, HR, SuperAdmin)
 */
router.get('/pending', protect, passwordResetController.getPendingRequests);

/**
 * @route   GET /api/password-reset/all
 * @desc    Get all password reset requests with filters
 * @access  Private (Admin, HR, SuperAdmin)
 */
router.get('/all', protect, passwordResetController.getAllRequests);

/**
 * @route   POST /api/password-reset/process
 * @desc    Process password reset request (approve/reject)
 * @access  Private (Admin, HR, SuperAdmin)
 */
router.post('/process', protect, validateProcessRequest, passwordResetController.processResetRequest);

module.exports = router;