const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../utils/emailServiceFrontend');
const { getSocketUtils } = require('../utils/socketUtils');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined
  };

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      data: {
        user: {
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
          lastLogin: user.lastLogin
        }
      }
    });
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    
    if (!isPasswordCorrect) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

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

    const { firstName, lastName, email, role, phone, department, position } = req.body;
    const creator = req.user;

    if (!creator.canCreate(role)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to create users with role: ${role}`
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: tempPassword,
      role,
      phone,
      department,
      position,
      createdBy: creator._id,
      emailVerificationToken,
      isEmailVerified: false
    });

    try {
      await emailService.sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tempPassword,
        role: user.role,
        verificationToken: emailVerificationToken
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Send real-time notification about user creation
    try {
      const socketUtils = getSocketUtils(req.app);
      await socketUtils.notifyUserCreated(user, creator);
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email sent with temporary password.',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        department: user.department,
        position: user.position,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user creation'
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({ emailVerificationToken: token });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    // Send real-time notification about password change
    try {
      const socketUtils = getSocketUtils(req.app);
      await socketUtils.notifyPasswordChanged(user._id);
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    try {
      await emailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        resetToken
      });

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset request'
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token if doesn't exist
    if (!user.emailVerificationToken) {
      user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      await user.save();
    }

    try {
      await emailService.sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationToken: user.emailVerificationToken
      });

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification resend'
    });
  }
};

exports.logout = (req, res) => {
  // Clear the token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
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
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting user profile'
    });
  }
};

exports.requestPasswordReset = async (req, res) => {
  console.log('🚀 requestPasswordReset function called');
  console.log('📨 Request body:', req.body);
  try {
    const errors = validationResult(req);
    console.log('✅ Validation errors:', errors.array());
    if (!errors.isEmpty()) {
      console.log('❌ Validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const PasswordResetRequest = require('../models/PasswordResetRequest');

    // Check if user exists
    console.log('🔍 Password reset request for email:', email);
    console.log('🔍 Searching for user with email:', email.toLowerCase());
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('🔍 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('🔍 User details:', { id: user._id, email: user.email, isActive: user.isActive });
    }
    if (!user) {
      console.log('❌ No user found with email:', email.toLowerCase());
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
      if (socketUtils && socketUtils.notifyPasswordResetRequest) {
        await socketUtils.notifyPasswordResetRequest(resetRequest);
      }
    } catch (socketError) {
      console.error('Socket notification failed:', socketError);
    }

    // Send notification email to admins (optional)
    try {
      if (emailService.notifyAdminsPasswordResetRequest) {
        await emailService.notifyAdminsPasswordResetRequest({
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          requestId: resetRequest._id
        });
      }
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