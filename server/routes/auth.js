const express = require('express');
const router = express.Router();
const {
  login,
  createUser,
  verifyEmail,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getMe
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateLogin,
  validateCreateUser,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/validation');

// Public routes
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.put('/reset-password/:token', validateResetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, validateChangePassword, changePassword);

// Admin/HR routes for creating users
router.post('/create-user', protect, authorize('superadmin', 'admin', 'hr'), validateCreateUser, createUser);

module.exports = router;