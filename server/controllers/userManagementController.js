const User = require('../models/User');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../utils/emailServiceFrontend');
const { getSocketUtils } = require('../utils/socketUtils');

/**
 * Get all users based on current user's permissions
 */
exports.getUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const { page = 1, limit = 50, search, role, status } = req.query;

    // Build query based on current user's permissions
    let query = {};

    // Role-based filtering
    if (currentUser.role === 'hr') {
      // HR can only see employees
      query.role = 'employee';
    } else if (currentUser.role === 'admin') {
      // Admin cannot see superadmins
      query.role = { $ne: 'superadmin' };
    }
    // Superadmin can see all users (no additional filter)

    // Apply additional filters
    if (role && role !== 'all') {
      if (currentUser.role === 'hr' && role !== 'employee') {
        return res.status(403).json({
          success: false,
          message: 'HR users can only view employees'
        });
      }
      query.role = role;
    }

    if (status && status !== 'all') {
      switch (status) {
        case 'active':
          query.isActive = true;
          break;
        case 'inactive':
          query.isActive = false;
          break;
        case 'unverified':
          query.isEmailVerified = false;
          break;
      }
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Transform users for frontend
    const transformedUsers = users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      phone: user.phone,
      department: user.department,
      position: user.position,
      avatar: user.avatar,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      createdBy: user.createdBy
    }));

    res.status(200).json({
      success: true,
      users: transformedUsers,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: users.length,
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

/**
 * Create a new user
 */
exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, role, employeeId, phone, department, position } = req.body;
    const currentUser = req.user;

    // Check if current user can create this role
    if (!currentUser.canCreate(role)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to create users with role: ${role}`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        errors: [{ field: 'email', message: 'This email is already registered' }]
      });
    }

    // Generate secure temporary password
    const tempPassword = generateSecurePassword();
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const newUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: tempPassword,
      role,
      employeeId: employeeId?.trim() || undefined,
      phone: phone?.trim() || undefined,
      department: department?.trim() || undefined,
      position: position?.trim() || undefined,
      createdBy: currentUser._id,
      emailVerificationToken,
      isEmailVerified: false
    });

    // Send welcome email with credentials (non-blocking but more reliable)
    let emailSent = false;

    // Send email with better error handling
    const sendWelcomeEmailAsync = async () => {
      try {
        console.log(`📧 Attempting to send welcome email to ${newUser.email}...`);
        console.log(`📧 Email service function available: ${typeof emailService.sendWelcomeEmail}`);
        console.log(`📧 Frontend API URL: ${process.env.FRONTEND_API_URL}`);

        await emailService.sendWelcomeEmail({
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          tempPassword,
          role: newUser.role,
          verificationToken: emailVerificationToken
        });
        console.log(`📧 Welcome email sent successfully to ${newUser.email}`);
        emailSent = true;
      } catch (emailError) {
        console.error(`📧 Failed to send welcome email to ${newUser.email}:`, emailError.message);
        console.error(`📧 Email error details:`, emailError);
        // TODO: Add to email retry queue
      }
    };

    // Execute email sending (don't wait for it to complete)
    sendWelcomeEmailAsync().catch(err => {
      console.error(`📧 Unexpected error in welcome email async function:`, err);
    });

    // Send real-time notification
    try {
      const socketUtils = getSocketUtils(req.app);
      await socketUtils.notifyUserCreated(newUser, currentUser);
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    const responseData = {
      success: true,
      message: `User created successfully! Welcome email with temporary password is being sent to ${newUser.email}.`,
      tempPassword: tempPassword, // Include temp password in response as fallback
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        department: newUser.department,
        position: newUser.position,
        isActive: newUser.isActive,
        isEmailVerified: newUser.isEmailVerified,
        createdAt: newUser.createdAt
      },
      emailSent
    };

    // Include temporary password if email failed
    if (!emailSent) {
      responseData.temporaryPassword = tempPassword;
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user creation'
    });
  }
};

/**
 * Update an existing user
 */
exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.body;
    const currentUser = req.user;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find target user
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    if (!canEditUser(currentUser, targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to edit this user'
      });
    }

    // Prevent self-deletion through deactivation unless superadmin
    if (targetUser._id.toString() === currentUser._id.toString() &&
        req.body.isActive === false &&
        currentUser.role !== 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Build update object
    const updateData = {};
    const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'department', 'position', 'isActive'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle role updates (only superadmin can change roles)
    if (req.body.role && req.body.role !== targetUser.role) {
      if (currentUser.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can change user roles'
        });
      }
      if (!currentUser.canCreate(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to assign role: ${req.body.role}`
        });
      }
      updateData.role = req.body.role;
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== targetUser.email) {
      const emailExists = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: id }
      });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
          errors: [{ field: 'email', message: 'This email is already registered' }]
        });
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');

    // Send real-time notification
    try {
      const socketUtils = getSocketUtils(req.app);
      await socketUtils.notifyUserUpdated(updatedUser, currentUser);
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        department: updatedUser.department,
        position: updatedUser.position,
        isActive: updatedUser.isActive,
        isEmailVerified: updatedUser.isEmailVerified,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user update'
    });
  }
};

/**
 * Delete a user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.query;
    const currentUser = req.user;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find target user
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    if (!canDeleteUser(currentUser, targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete this user'
      });
    }

    // Prevent self-deletion
    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Clean up user references in other collections
    const Project = require('../models/Project');
    const Board = require('../models/Board');
    const Card = require('../models/Card');
    const Activity = require('../models/Activity');

    // Remove user from project members arrays
    await Project.updateMany(
      { 'members.user': id },
      { $pull: { members: { user: id } } }
    );

    // Clean up addedBy references in project members
    const projectsWithMembers = await Project.find({ 'members.addedBy': id });
    for (const project of projectsWithMembers) {
      project.members.forEach(member => {
        if (member.addedBy && member.addedBy.toString() === id) {
          member.addedBy = undefined;
        }
      });
      await project.save();
    }

    // Update projects where user is the owner (transfer to a superadmin or archive)
    const orphanedProjects = await Project.find({ owner: id });
    for (const project of orphanedProjects) {
      // Find a suitable superadmin to transfer ownership
      const superadmin = await User.findOne({ role: 'superadmin', isActive: true });
      if (superadmin) {
        project.owner = superadmin._id;
        await project.save();
      } else {
        // If no superadmin found, archive the project
        project.isArchived = true;
        await project.save();
      }
    }

    // Update boards where user is the creator
    await Board.updateMany(
      { createdBy: id },
      { $unset: { createdBy: 1 } }
    );

    // Clean up card references comprehensively
    const cardsToUpdate = await Card.find({
      $or: [
        { assignedTo: id },
        { createdBy: id },
        { watchers: id },
        { completedBy: id },
        { archivedBy: id },
        { 'checklist.completedBy': id },
        { 'attachments.uploadedBy': id },
        { 'comments.author': id },
        { 'comments.mentions': id },
        { 'timeTracking.entries.user': id }
      ]
    });

    for (const card of cardsToUpdate) {
      // Remove from assignedTo array
      card.assignedTo = card.assignedTo.filter(userId => userId && userId.toString() !== id);

      // Remove from watchers array
      card.watchers = card.watchers.filter(userId => userId && userId.toString() !== id);

      // Clear single user references
      if (card.createdBy && card.createdBy.toString() === id) {
        card.createdBy = undefined;
      }
      if (card.completedBy && card.completedBy.toString() === id) {
        card.completedBy = undefined;
      }
      if (card.archivedBy && card.archivedBy.toString() === id) {
        card.archivedBy = undefined;
      }

      // Clean checklist completed by references
      if (card.checklist && card.checklist.length > 0) {
        card.checklist.forEach(item => {
          if (item.completedBy && item.completedBy.toString() === id) {
            item.completedBy = undefined;
          }
        });
      }

      // Clean attachment uploaded by references
      if (card.attachments && card.attachments.length > 0) {
        card.attachments.forEach(attachment => {
          if (attachment.uploadedBy && attachment.uploadedBy.toString() === id) {
            attachment.uploadedBy = undefined;
          }
        });
      }

      // Clean comment author and mentions
      if (card.comments && card.comments.length > 0) {
        card.comments.forEach(comment => {
          if (comment.author && comment.author.toString() === id) {
            comment.author = undefined;
          }
          if (comment.mentions && comment.mentions.length > 0) {
            comment.mentions = comment.mentions.filter(userId => userId && userId.toString() !== id);
          }
        });
      }

      // Clean time tracking entries
      if (card.timeTracking && card.timeTracking.entries && card.timeTracking.entries.length > 0) {
        card.timeTracking.entries.forEach(entry => {
          if (entry.user && entry.user.toString() === id) {
            entry.user = undefined;
          }
        });
      }

      await card.save();
    }

    // Clean up activities related to this user
    await Activity.deleteMany({
      $or: [
        { user: id },
        { 'data.userId': id },
        { 'data.assignedTo': id }
      ]
    });

    // Delete user
    await User.findByIdAndDelete(id);

    // Send real-time notification
    try {
      const socketUtils = getSocketUtils(req.app);
      await socketUtils.notifyUserDeleted(targetUser, currentUser);
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully and all references cleaned up'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user deletion'
    });
  }
};

/**
 * Get user statistics
 */
exports.getUserStats = async (req, res) => {
  try {
    const currentUser = req.user;

    // Build query based on permissions
    let baseQuery = {};
    if (currentUser.role === 'hr') {
      baseQuery.role = 'employee';
    } else if (currentUser.role === 'admin') {
      baseQuery.role = { $ne: 'superadmin' };
    }

    const stats = await Promise.all([
      User.countDocuments(baseQuery), // Total users
      User.countDocuments({ ...baseQuery, isActive: true }), // Active users
      User.countDocuments({ ...baseQuery, isEmailVerified: false }), // Unverified users
      User.countDocuments({ ...baseQuery, role: { $in: ['admin', 'superadmin'] } }) // Admins
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: stats[0],
        activeUsers: stats[1],
        unverifiedUsers: stats[2],
        adminUsers: stats[3]
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics'
    });
  }
};

// Helper functions
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

function canEditUser(currentUser, targetUser) {
  // Superadmin can edit anyone
  if (currentUser.role === 'superadmin') return true;

  // Cannot edit superadmin users
  if (targetUser.role === 'superadmin') return false;

  // Admin can edit non-superadmin users
  if (currentUser.role === 'admin' && targetUser.role !== 'superadmin') return true;

  // HR can only edit employees
  if (currentUser.role === 'hr' && targetUser.role === 'employee') return true;

  return false;
}

function canDeleteUser(currentUser, targetUser) {
  // HR cannot delete anyone
  if (currentUser.role === 'hr') return false;

  // Superadmin can delete anyone (except self, handled separately)
  if (currentUser.role === 'superadmin') return true;

  // Admin can delete non-superadmin users
  if (currentUser.role === 'admin' && targetUser.role !== 'superadmin') return true;

  return false;
}