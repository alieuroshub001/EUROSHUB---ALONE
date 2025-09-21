const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Card = require('../models/Card');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');
const emailService = require('../utils/emailService');

/**
 * @route   POST /api/notifications/task-assignment
 * @desc    Send task assignment notification
 * @access  Private
 */
router.post('/task-assignment', protect, async (req, res) => {
  try {
    const {
      recipientId,
      taskId,
      taskTitle,
      projectId,
      assignedBy,
      dueDate
    } = req.body;

    // Validate required fields
    if (!recipientId || !taskId || !taskTitle || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: recipientId, taskId, taskTitle, projectId'
      });
    }

    // Get recipient user
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }

    // Get project details
    const project = await Project.findById(projectId).populate('owner', 'firstName lastName');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get task details
    const task = await Card.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get assigner details
    const assigner = await User.findById(assignedBy || req.user.id);

    // Send email notification
    try {
      const emailData = {
        to: recipient.email,
        subject: `New Task Assignment: ${taskTitle}`,
        template: 'task-assignment',
        data: {
          recipientName: recipient.firstName,
          taskTitle,
          projectTitle: project.title,
          assignerName: assigner ? `${assigner.firstName} ${assigner.lastName}` : 'System',
          dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date',
          taskDescription: task.description || 'No description provided',
          projectUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}`,
          taskUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}/tasks/${taskId}`
        }
      };

      await emailService.sendEmail(emailData);

      res.status(200).json({
        success: true,
        message: 'Task assignment notification sent successfully'
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);

      // Return success even if email fails to avoid breaking the assignment flow
      res.status(200).json({
        success: true,
        message: 'Task assigned successfully (email notification failed)',
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error('Task assignment notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending task assignment notification'
    });
  }
});

/**
 * @route   POST /api/notifications/email
 * @desc    Send bulk email notifications
 * @access  Private
 */
router.post('/email', protect, async (req, res) => {
  try {
    const {
      recipients,
      subject,
      template,
      data
    } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipients array is required and cannot be empty'
      });
    }

    if (!subject || !template) {
      return res.status(400).json({
        success: false,
        message: 'Subject and template are required'
      });
    }

    const results = [];

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        // Get user details if recipient is an ID
        let recipientEmail = recipient;
        let recipientName = 'User';

        if (typeof recipient === 'string' && recipient.match(/^[0-9a-fA-F]{24}$/)) {
          // It's an ObjectId
          const user = await User.findById(recipient);
          if (user) {
            recipientEmail = user.email;
            recipientName = user.firstName;
          } else {
            results.push({
              recipient,
              success: false,
              error: 'User not found'
            });
            continue;
          }
        } else if (typeof recipient === 'object' && recipient.email) {
          recipientEmail = recipient.email;
          recipientName = recipient.name || 'User';
        }

        const emailData = {
          to: recipientEmail,
          subject,
          template,
          data: {
            recipientName,
            ...data
          }
        };

        await emailService.sendEmail(emailData);

        results.push({
          recipient: recipientEmail,
          success: true
        });
      } catch (emailError) {
        console.error(`Email sending failed for recipient ${recipient}:`, emailError);
        results.push({
          recipient,
          success: false,
          error: emailError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Bulk email notification completed: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('Bulk email notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending bulk email notifications'
    });
  }
});

/**
 * @route   POST /api/notifications/task-comment
 * @desc    Send task comment notification
 * @access  Private
 */
router.post('/task-comment', protect, async (req, res) => {
  try {
    const {
      taskId,
      commentText,
      commenterName,
      taskTitle,
      projectId,
      watchers
    } = req.body;

    // Validate required fields
    if (!taskId || !commentText || !taskTitle || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: taskId, commentText, taskTitle, projectId'
      });
    }

    if (!watchers || !Array.isArray(watchers) || watchers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No watchers to notify'
      });
    }

    // Get project details
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const results = [];

    // Send notifications to all watchers
    for (const watcherId of watchers) {
      try {
        // Skip notifying the commenter
        if (watcherId === req.user.id) {
          continue;
        }

        const watcher = await User.findById(watcherId);
        if (!watcher) {
          results.push({
            recipient: watcherId,
            success: false,
            error: 'User not found'
          });
          continue;
        }

        const emailData = {
          to: watcher.email,
          subject: `New comment on task: ${taskTitle}`,
          template: 'task-comment',
          data: {
            recipientName: watcher.firstName,
            taskTitle,
            projectTitle: project.title,
            commenterName: commenterName || `${req.user.firstName} ${req.user.lastName}`,
            commentText,
            taskUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}/tasks/${taskId}`
          }
        };

        await emailService.sendEmail(emailData);

        results.push({
          recipient: watcher.email,
          success: true
        });
      } catch (emailError) {
        console.error(`Comment notification failed for watcher ${watcherId}:`, emailError);
        results.push({
          recipient: watcherId,
          success: false,
          error: emailError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Comment notifications sent: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('Task comment notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending task comment notifications'
    });
  }
});

/**
 * @route   POST /api/notifications/task-due
 * @desc    Send task due date notification
 * @access  Private
 */
router.post('/task-due', protect, async (req, res) => {
  try {
    const {
      taskId,
      taskTitle,
      projectId,
      dueDate,
      assignees,
      isOverdue = false
    } = req.body;

    // Validate required fields
    if (!taskId || !taskTitle || !projectId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: taskId, taskTitle, projectId, dueDate'
      });
    }

    if (!assignees || !Array.isArray(assignees) || assignees.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No assignees to notify'
      });
    }

    // Get project details
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const results = [];
    const formattedDueDate = new Date(dueDate).toLocaleDateString();

    // Send notifications to all assignees
    for (const assigneeId of assignees) {
      try {
        const assignee = await User.findById(assigneeId);
        if (!assignee) {
          results.push({
            recipient: assigneeId,
            success: false,
            error: 'User not found'
          });
          continue;
        }

        const subject = isOverdue
          ? `Overdue Task: ${taskTitle}`
          : `Task Due Soon: ${taskTitle}`;

        const emailData = {
          to: assignee.email,
          subject,
          template: isOverdue ? 'task-overdue' : 'task-due',
          data: {
            recipientName: assignee.firstName,
            taskTitle,
            projectTitle: project.title,
            dueDate: formattedDueDate,
            isOverdue,
            taskUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}/tasks/${taskId}`
          }
        };

        await emailService.sendEmail(emailData);

        results.push({
          recipient: assignee.email,
          success: true
        });
      } catch (emailError) {
        console.error(`Due date notification failed for assignee ${assigneeId}:`, emailError);
        results.push({
          recipient: assigneeId,
          success: false,
          error: emailError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `Due date notifications sent: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('Task due date notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending task due date notifications'
    });
  }
});

module.exports = router;