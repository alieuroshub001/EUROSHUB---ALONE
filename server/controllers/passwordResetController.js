const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../utils/emailService');
const slackService = require('../utils/slackService');
const { getSocketUtils } = require('../utils/socketUtils');

/**
 * Request password reset
 */
exports.requestPasswordReset = async (req, res) => {
  console.log('🎯 passwordResetController.requestPasswordReset called');
  console.log('📨 Request body:', req.body);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact your administrator.'
      });
    }

    // Check for existing pending request
    const existingRequest = await PasswordResetRequest.findOne({
      userEmail: email.toLowerCase(),
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: 'A password reset request is already pending for this account. Please wait for administrator approval.'
      });
    }

    // Create new password reset request
    const resetRequest = await PasswordResetRequest.create({
      userEmail: user.email,
      userId: user._id,
      requestedBy: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });

    // Notify administrators via socket (optional)
    try {
      const socketUtils = getSocketUtils(req.app);
      await socketUtils.notifyPasswordResetRequest(resetRequest);
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    // Send notification email to admins (optional)
    try {
      await emailService.notifyAdminsPasswordResetRequest({
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        requestId: resetRequest._id
      });
    } catch (emailError) {
      console.error('Admin notification email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Password reset request submitted successfully. Administrators will review and process your request.',
      requestId: resetRequest._id
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

/**
 * Get pending password reset requests (for admins)
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 50 } = req.query;

    // Check admin permissions
    if (!['superadmin', 'admin', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access password reset requests'
      });
    }

    // Get requests based on admin role
    let query = PasswordResetRequest.getPendingRequests(currentUser.role);

    // Apply pagination
    const requests = await query
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter based on HR permissions (only employee requests)
    let filteredRequests = requests;
    if (currentUser.role === 'hr') {
      filteredRequests = requests.filter(request =>
        request.userId && request.userId.role === 'employee'
      );
    } else if (currentUser.role === 'admin') {
      // Admin cannot see superadmin reset requests
      filteredRequests = requests.filter(request =>
        request.userId && request.userId.role !== 'superadmin'
      );
    }

    const total = filteredRequests.length;

    // Transform for frontend
    const transformedRequests = filteredRequests.map(request => ({
      id: request._id,
      userEmail: request.userEmail,
      user: request.userId ? {
        firstName: request.userId.firstName,
        lastName: request.userId.lastName,
        email: request.userId.email,
        role: request.userId.role
      } : request.requestedBy,
      status: request.status,
      requestedAt: request.requestedAt,
      requestAge: request.requestAge,
      notes: request.notes
    }));

    res.status(200).json({
      success: true,
      requests: transformedRequests,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: transformedRequests.length,
        totalRequests: total
      }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching password reset requests'
    });
  }
};

/**
 * Process password reset request (approve/reject)
 */
exports.processResetRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { requestId, action, notes } = req.body; // action: 'approve' or 'reject'
    const currentUser = req.user;

    // Check admin permissions
    if (!['superadmin', 'admin', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to process password reset requests'
      });
    }

    // Find the request
    const resetRequest = await PasswordResetRequest.findById(requestId)
      .populate('userId', 'firstName lastName email role password');

    if (!resetRequest) {
      return res.status(404).json({
        success: false,
        message: 'Password reset request not found'
      });
    }

    if (resetRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    // Check role-based permissions for this specific request
    if (currentUser.role === 'hr' && resetRequest.userId.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'HR users can only process employee password reset requests'
      });
    }

    if (currentUser.role === 'admin' && resetRequest.userId.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin users cannot process superadmin password reset requests'
      });
    }

    if (action === 'approve') {
      // Generate new secure password
      const newPassword = generateSecurePassword();

      // Update user's password
      resetRequest.userId.password = newPassword;
      await resetRequest.userId.save();

      // Update request status
      resetRequest.status = 'approved';
      resetRequest.processedAt = new Date();
      resetRequest.processedBy = currentUser._id;
      resetRequest.processorInfo = {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        role: currentUser.role
      };
      resetRequest.notes = notes || '';
      resetRequest.newPassword = newPassword; // Store for email

      await resetRequest.save();

      // Send new password to user via both email and Slack
      let emailSent = false;
      let slackSent = false;
      
      try {
        await emailService.sendPasswordResetSuccess({
          email: resetRequest.userId.email,
          firstName: resetRequest.userId.firstName,
          lastName: resetRequest.userId.lastName,
          newPassword: newPassword,
          processorName: `${currentUser.firstName} ${currentUser.lastName}`
        });
        emailSent = true;
        console.log('✅ Password reset approval email sent successfully');
      } catch (emailError) {
        console.error('❌ Password reset email failed:', emailError);
      }

      // Send Slack notification (non-blocking)
      try {
        await slackService.notifyPasswordResetApproved({
          email: resetRequest.userId.email,
          firstName: resetRequest.userId.firstName,
          lastName: resetRequest.userId.lastName,
          newPassword: newPassword,
          processorName: `${currentUser.firstName} ${currentUser.lastName}`,
          requestId: resetRequest._id
        });
        slackSent = true;
        console.log('✅ Password reset approval Slack notification sent successfully');
      } catch (slackError) {
        console.error('❌ Password reset Slack notification failed:', slackError);
      }

      // Update the request with notification status
      resetRequest.emailSent = emailSent;
      resetRequest.slackSent = slackSent;
      await resetRequest.save();

      // Send real-time notification
      try {
        const socketUtils = getSocketUtils(req.app);
        await socketUtils.notifyPasswordResetProcessed(resetRequest, 'approved');
      } catch (socketError) {
        console.error('Socket notification failed:', socketError);
      }

      const successMessage = [];
      if (emailSent) successMessage.push('email');
      if (slackSent) successMessage.push('Slack');
      
      const notificationStatus = successMessage.length > 0 
        ? `New credentials sent via ${successMessage.join(' and ')}.`
        : 'Failed to send notifications - please provide credentials manually.';

      res.status(200).json({
        success: true,
        message: `Password reset approved. ${notificationStatus}`,
        newPassword: (!emailSent && !slackSent) ? newPassword : undefined, // Only include if both failed
        notifications: {
          email: emailSent,
          slack: slackSent
        }
      });

    } else if (action === 'reject') {
      // Update request status
      resetRequest.status = 'rejected';
      resetRequest.processedAt = new Date();
      resetRequest.processedBy = currentUser._id;
      resetRequest.processorInfo = {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        role: currentUser.role
      };
      resetRequest.notes = notes || 'Request rejected by administrator';

      await resetRequest.save();

      // Notify user of rejection via both email and Slack
      let rejectionEmailSent = false;
      let rejectionSlackSent = false;
      
      try {
        await emailService.sendPasswordResetRejected({
          email: resetRequest.userId.email,
          firstName: resetRequest.userId.firstName,
          lastName: resetRequest.userId.lastName,
          reason: notes || 'No reason provided',
          processorName: `${currentUser.firstName} ${currentUser.lastName}`
        });
        rejectionEmailSent = true;
        console.log('✅ Password reset rejection email sent successfully');
      } catch (emailError) {
        console.error('❌ Password reset rejection email failed:', emailError);
      }

      // Send Slack notification (non-blocking)
      try {
        await slackService.notifyPasswordResetRejected({
          email: resetRequest.userId.email,
          firstName: resetRequest.userId.firstName,
          lastName: resetRequest.userId.lastName,
          reason: notes || 'No reason provided',
          processorName: `${currentUser.firstName} ${currentUser.lastName}`,
          requestId: resetRequest._id
        });
        rejectionSlackSent = true;
        console.log('✅ Password reset rejection Slack notification sent successfully');
      } catch (slackError) {
        console.error('❌ Password reset rejection Slack notification failed:', slackError);
      }

      // Update the request with notification status
      resetRequest.rejectionEmailSent = rejectionEmailSent;
      resetRequest.rejectionSlackSent = rejectionSlackSent;
      await resetRequest.save();

      // Send real-time notification
      try {
        const socketUtils = getSocketUtils(req.app);
        await socketUtils.notifyPasswordResetProcessed(resetRequest, 'rejected');
      } catch (socketError) {
        console.error('Socket notification failed:', socketError);
      }

      const rejectionSuccessMessage = [];
      if (rejectionEmailSent) rejectionSuccessMessage.push('email');
      if (rejectionSlackSent) rejectionSuccessMessage.push('Slack');
      
      const rejectionNotificationStatus = rejectionSuccessMessage.length > 0 
        ? ` User notified via ${rejectionSuccessMessage.join(' and ')}.`
        : ' Failed to send notifications to user.';

      res.status(200).json({
        success: true,
        message: `Password reset request rejected successfully.${rejectionNotificationStatus}`,
        notifications: {
          email: rejectionEmailSent,
          slack: rejectionSlackSent
        }
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject".'
      });
    }

  } catch (error) {
    console.error('Process reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request'
    });
  }
};

/**
 * Get all password reset requests (with history)
 */
exports.getAllRequests = async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 50, status, userEmail } = req.query;

    // Check admin permissions
    if (!['superadmin', 'admin', 'hr'].includes(currentUser.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access password reset requests'
      });
    }

    // Build query
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (userEmail) {
      query.userEmail = { $regex: userEmail, $options: 'i' };
    }

    // Get requests with population
    let requestsQuery = PasswordResetRequest.find(query)
      .populate('userId', 'firstName lastName email role')
      .populate('processedBy', 'firstName lastName email role')
      .sort({ requestedAt: -1 });

    // Apply pagination
    const requests = await requestsQuery
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter based on permissions
    let filteredRequests = requests;
    if (currentUser.role === 'hr') {
      filteredRequests = requests.filter(request =>
        request.userId && request.userId.role === 'employee'
      );
    } else if (currentUser.role === 'admin') {
      filteredRequests = requests.filter(request =>
        request.userId && request.userId.role !== 'superadmin'
      );
    }

    const total = await PasswordResetRequest.countDocuments(query);

    // Transform for frontend
    const transformedRequests = filteredRequests.map(request => ({
      id: request._id,
      userEmail: request.userEmail,
      user: request.userId ? {
        firstName: request.userId.firstName,
        lastName: request.userId.lastName,
        email: request.userId.email,
        role: request.userId.role
      } : request.requestedBy,
      status: request.status,
      requestedAt: request.requestedAt,
      processedAt: request.processedAt,
      processor: request.processedBy ? {
        firstName: request.processedBy.firstName,
        lastName: request.processedBy.lastName,
        email: request.processedBy.email,
        role: request.processedBy.role
      } : request.processorInfo,
      notes: request.notes,
      emailSent: request.emailSent,
      requestAge: request.requestAge
    }));

    res.status(200).json({
      success: true,
      requests: transformedRequests,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: transformedRequests.length,
        totalRequests: total
      }
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching password reset requests'
    });
  }
};

// Helper function to generate secure password
function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one character from each category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}