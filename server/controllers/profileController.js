const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { deleteFile } = require('../config/cloudinary');

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          employeeId: user.employeeId,
          phone: user.phone,
          department: user.department,
          position: user.position,
          role: user.role,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, employeeId, phone, department, position } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Role-based field restrictions
    const userRole = req.user.role;
    const isPrivilegedUser = ['superadmin', 'admin', 'hr'].includes(userRole);

    // Update only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || undefined;

    // Only privileged users (superadmin, admin, hr) can update these fields
    if (isPrivilegedUser) {
      if (employeeId !== undefined) updateData.employeeId = employeeId.trim() || undefined;
      if (department !== undefined) updateData.department = department.trim() || undefined;
      if (position !== undefined) updateData.position = position.trim() || undefined;
    } else {
      // Regular employees cannot update these fields
      if (employeeId !== undefined || department !== undefined || position !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update employee ID, department, or position fields'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          employeeId: updatedUser.employeeId,
          phone: updatedUser.phone,
          department: updatedUser.department,
          position: updatedUser.position,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          isEmailVerified: updatedUser.isEmailVerified,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          avatar: updatedUser.avatar
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        errors: [{ field: 'currentPassword', message: 'Current password is incorrect' }]
      });
    }

    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
        errors: [{ field: 'newPassword', message: 'New password must be different from current password' }]
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Upload avatar
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get current user to check for existing avatar
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar from Cloudinary if it exists
    if (currentUser.avatar) {
      try {
        // Extract public_id from the old avatar URL
        const oldAvatarUrl = currentUser.avatar;
        if (oldAvatarUrl.includes('cloudinary.com')) {
          const urlParts = oldAvatarUrl.split('/');
          const publicIdWithExtension = urlParts[urlParts.length - 1];
          const publicId = publicIdWithExtension.split('.')[0];
          await deleteFile(`euroshub/avatars/${publicId}`);
        }
      } catch (deleteError) {
        console.warn('Failed to delete old avatar from Cloudinary:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // The new avatar URL from Cloudinary
    const avatarUrl = req.file.path;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          employeeId: updatedUser.employeeId,
          phone: updatedUser.phone,
          department: updatedUser.department,
          position: updatedUser.position,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          isEmailVerified: updatedUser.isEmailVerified,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          avatar: updatedUser.avatar
        }
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
};

// Delete avatar
exports.deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user to access avatar URL
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete avatar from Cloudinary if it exists
    if (currentUser.avatar && currentUser.avatar.includes('cloudinary.com')) {
      try {
        // Extract public_id from the avatar URL
        const avatarUrl = currentUser.avatar;
        const urlParts = avatarUrl.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        await deleteFile(`euroshub/avatars/${publicId}`);
      } catch (deleteError) {
        console.warn('Failed to delete avatar from Cloudinary:', deleteError);
        // Continue with database update even if cloud deletion fails
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: null },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Avatar deleted successfully',
      data: {
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          employeeId: updatedUser.employeeId,
          phone: updatedUser.phone,
          department: updatedUser.department,
          position: updatedUser.position,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          isEmailVerified: updatedUser.isEmailVerified,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
          avatar: updatedUser.avatar
        }
      }
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete avatar'
    });
  }
};