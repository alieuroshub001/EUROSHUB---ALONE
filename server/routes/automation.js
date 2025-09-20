const express = require('express');
const router = express.Router();

const automationService = require('../services/automationService');
const emailService = require('../utils/emailService');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/automation/test-email
 * @desc    Test email configuration
 * @access  Private (Admin only)
 */
router.post('/test-email', protect, async (req, res) => {
  try {
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can test email configuration'
      });
    }

    const { testEmail } = req.body;
    const emailToTest = testEmail || req.user.email;

    const subject = 'EUROSHUB Email Test';
    const content = `
      <p>Hello ${req.user.firstName} ${req.user.lastName},</p>
      <p>This is a test email to verify that your EUROSHUB email automation is working correctly.</p>
      <p>If you received this email, your email configuration is set up properly!</p>
      <ul>
        <li>Test performed by: ${req.user.firstName} ${req.user.lastName}</li>
        <li>Test time: ${new Date().toLocaleString()}</li>
        <li>Server: ${process.env.NODE_ENV || 'development'}</li>
      </ul>
    `;

    const htmlContent = emailService.generateEmailTemplate(subject, content);
    await emailService.sendEmail(emailToTest, subject, htmlContent);

    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${emailToTest}`
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email: ' + error.message
    });
  }
});

/**
 * @route   POST /api/automation/send-digest
 * @desc    Manually trigger daily digest for a user
 * @access  Private (Admin only)
 */
router.post('/send-digest', protect, async (req, res) => {
  try {
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can manually trigger digests'
      });
    }

    const { userId } = req.body;
    const targetUserId = userId || req.user.id;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const digest = await automationService.generateUserDigest(targetUserId, yesterday, today);

    if (digest.hasContent) {
      const User = require('../models/User');
      const user = await User.findById(targetUserId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await emailService.sendDigestNotification(
        user.email,
        `${user.firstName} ${user.lastName}`,
        digest
      );

      res.status(200).json({
        success: true,
        message: `Digest sent successfully to ${user.firstName} ${user.lastName}`,
        data: digest
      });
    } else {
      res.status(200).json({
        success: true,
        message: 'No digest content to send - user has no recent activity'
      });
    }
  } catch (error) {
    console.error('Manual digest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send digest: ' + error.message
    });
  }
});

/**
 * @route   GET /api/automation/status
 * @desc    Get automation service status
 * @access  Private (Admin only)
 */
router.get('/status', protect, async (req, res) => {
  try {
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view automation status'
      });
    }

    const status = {
      emailService: {
        configured: !!(process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD),
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USERNAME || 'Not configured'
      },
      cronJobs: {
        dailyDigest: 'Active (9 AM daily)',
        dueDateReminders: 'Active (hourly)',
        weeklyProjectSummary: 'Active (Monday 10 AM)'
      },
      features: {
        memberAdditionNotifications: true,
        taskAssignmentNotifications: true,
        statusChangeNotifications: true,
        commentNotifications: true,
        dueDateReminders: true,
        automaticStatusUpdates: true,
        digestEmails: true,
        weeklyProjectSummaries: true
      }
    };

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Automation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching automation status'
    });
  }
});

/**
 * @route   POST /api/automation/check-due-dates
 * @desc    Manually trigger due date reminder check
 * @access  Private (Admin only)
 */
router.post('/check-due-dates', protect, async (req, res) => {
  try {
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can manually trigger due date checks'
      });
    }

    await automationService.checkDueDateReminders();

    res.status(200).json({
      success: true,
      message: 'Due date reminder check completed successfully'
    });
  } catch (error) {
    console.error('Manual due date check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check due dates: ' + error.message
    });
  }
});

/**
 * @route   GET /api/automation/metrics
 * @desc    Get automation metrics and statistics
 * @access  Private (Admin only)
 */
router.get('/metrics', protect, async (req, res) => {
  try {
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view automation metrics'
      });
    }

    const Card = require('../models/Card');
    const User = require('../models/User');
    const Project = require('../models/Project');
    const Activity = require('../models/Activity');

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalUsers,
      activeProjects,
      overdueTasks,
      tasksDueToday,
      tasksDueTomorrow,
      recentActivities
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Project.countDocuments({ isArchived: false }),
      Card.countDocuments({
        dueDate: { $lt: today },
        status: { $nin: ['completed'] },
        isArchived: false
      }),
      Card.countDocuments({
        dueDate: {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        },
        status: { $nin: ['completed'] },
        isArchived: false
      }),
      Card.countDocuments({
        dueDate: {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)
        },
        status: { $nin: ['completed'] },
        isArchived: false
      }),
      Activity.countDocuments({
        createdAt: { $gte: weekAgo }
      })
    ]);

    const metrics = {
      overview: {
        totalUsers,
        activeProjects,
        overdueTasks,
        tasksDueToday,
        tasksDueTomorrow,
        recentActivities
      },
      notifications: {
        estimatedDailyDigests: totalUsers,
        estimatedDueReminders: overdueTasks + tasksDueToday + tasksDueTomorrow,
        weeklyProjectSummaries: activeProjects
      },
      automation: {
        averageActivitiesPerWeek: Math.round(recentActivities),
        automationCoverage: '100%'
      }
    };

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Automation metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching automation metrics'
    });
  }
});

module.exports = router;