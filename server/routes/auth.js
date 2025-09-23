const express = require('express');
const router = express.Router();
const {
  login,
  createUser,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  requestPasswordReset
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateLogin,
  validateCreateUser,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/validation');

// Additional validation for password reset request
const { body } = require('express-validator');
const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    // .normalizeEmail() // Removed this as it removes dots from Gmail addresses
];

// Public routes
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.put('/reset-password/:token', validateResetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/request-password-reset', validatePasswordResetRequest, requestPasswordReset);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', logout); // Logout should not require authentication
router.put('/change-password', protect, validateChangePassword, changePassword);

// Admin/HR routes for creating users
router.post('/create-user', protect, authorize('superadmin', 'admin', 'hr'), validateCreateUser, createUser);

module.exports = router;