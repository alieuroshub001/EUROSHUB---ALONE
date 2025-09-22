const emailService = require('../utils/emailService');
const User = require('../models/User');
const Card = require('../models/Card');
const List = require('../models/List');
const Project = require('../models/Project');
const mongoose = require('mongoose');
const cron = require('node-cron');

class AutomationService {
  constructor() {
    this.setupCronJobs();
    this.checklistLocks = new Set(); // Track cards currently being processed
  }

  setupCronJobs() {
    // Daily digest at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.sendDailyDigest();
    });

    // Check for due date reminders every hour
    cron.schedule('0 * * * *', () => {
      this.checkDueDateReminders();
    });

    // Weekly project summary every Monday at 10 AM
    cron.schedule('0 10 * * 1', () => {
      this.sendWeeklyProjectSummary();
    });

    console.log('Automation service cron jobs initialized');
  }

  async handleProjectMemberAdded(projectId, memberId, addedById, role) {
    try {
      const [project, member, addedBy] = await Promise.all([
        Project.findById(projectId),
        User.findById(memberId),
        User.findById(addedById)
      ]);

      if (!project || !member || !addedBy) {
        console.error('Missing data for member addition notification');
        return;
      }

      await emailService.sendProjectMemberAddedNotification(
        member.email,
        `${member.firstName} ${member.lastName}`,
        project.title,
        project.description,
        `${addedBy.firstName} ${addedBy.lastName}`,
        role
      );

      console.log(`Member addition notification sent to ${member.email}`);
    } catch (error) {
      console.error('Error sending member addition notification:', error);
    }
  }

  async handleTaskAssignment(cardId, assigneeIds, assignedById) {
    try {
      const card = await Card.findById(cardId)
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email')
        .populate('list', 'title');

      const assignedBy = await User.findById(assignedById);

      if (!card || !assignedBy) {
        console.error('Missing data for task assignment notification');
        return;
      }

      // Send notification to each newly assigned user
      for (const assignee of card.assignedTo) {
        if (assigneeIds.includes(assignee._id.toString())) {
          await emailService.sendTaskAssignmentNotification(
            assignee.email,
            `${assignee.firstName} ${assignee.lastName}`,
            card.title,
            card.description,
            card.project.title,
            `${assignedBy.firstName} ${assignedBy.lastName}`,
            card.dueDate
          );

          console.log(`Task assignment notification sent to ${assignee.email}`);
        }
      }
    } catch (error) {
      console.error('Error sending task assignment notification:', error);
    }
  }

  async handleTaskStatusChange(cardId, oldStatus, newStatus, changedById) {
    try {
      const card = await Card.findById(cardId)
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email')
        .populate('watchers', 'firstName lastName email');

      const changedBy = await User.findById(changedById);

      if (!card || !changedBy) {
        console.error('Missing data for status change notification');
        return;
      }

      // Get all users to notify (assignees + watchers, excluding the person who made the change)
      const usersToNotify = new Set();

      card.assignedTo.forEach(user => usersToNotify.add(user));
      card.watchers.forEach(user => usersToNotify.add(user));

      // Remove the person who made the change
      const filteredUsers = Array.from(usersToNotify).filter(
        user => user._id.toString() !== changedById.toString()
      );

      for (const user of filteredUsers) {
        await emailService.sendTaskStatusChangeNotification(
          user.email,
          `${user.firstName} ${user.lastName}`,
          card.title,
          card.project.title,
          oldStatus,
          newStatus,
          `${changedBy.firstName} ${changedBy.lastName}`
        );
      }

      console.log(`Status change notifications sent for card ${card.title}`);
    } catch (error) {
      console.error('Error sending status change notification:', error);
    }
  }

  async handleTaskComment(cardId, commentText, commentorId) {
    try {
      const card = await Card.findById(cardId)
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email')
        .populate('watchers', 'firstName lastName email');

      const commentor = await User.findById(commentorId);

      if (!card || !commentor) {
        console.error('Missing data for comment notification');
        return;
      }

      // Get all users to notify (assignees + watchers, excluding the commentor)
      const usersToNotify = new Set();

      card.assignedTo.forEach(user => usersToNotify.add(user));
      card.watchers.forEach(user => usersToNotify.add(user));

      // Remove the commentor
      const filteredUsers = Array.from(usersToNotify).filter(
        user => user._id.toString() !== commentorId.toString()
      );

      for (const user of filteredUsers) {
        await emailService.sendTaskCommentNotification(
          user.email,
          `${user.firstName} ${user.lastName}`,
          `${commentor.firstName} ${commentor.lastName}`,
          card.title,
          card.project.title,
          commentText,
          cardId
        );
      }

      console.log(`Comment notifications sent for card ${card.title}`);
    } catch (error) {
      console.error('Error sending comment notification:', error);
    }
  }

  async checkDueDateReminders() {
    try {
      console.log('Checking for due date reminders...');

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      // Find cards due today, tomorrow, or in 3 days, or overdue
      const dueTasks = await Card.find({
        dueDate: { $lte: threeDaysFromNow },
        status: { $nin: ['completed'] },
        isArchived: false,
        assignedTo: { $exists: true, $ne: [] }
      })
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email')
        .populate('list', 'title');

      for (const task of dueTasks) {
        // Skip tasks with missing required data
        if (!task || !task.project || !task.title || !task.assignedTo || task.assignedTo.length === 0) {
          console.warn(`Skipping task with missing data: ${task?._id || 'unknown'}`);
          continue;
        }

        const daysUntilDue = Math.ceil((task.dueDate - now) / (1000 * 60 * 60 * 24));

        // Send reminders for overdue, due today, due tomorrow, or due in 3 days
        if (daysUntilDue <= 0 || daysUntilDue === 1 || daysUntilDue === 3) {
          for (const assignee of task.assignedTo) {
            if (assignee && assignee.email && assignee.firstName && assignee.lastName) {
              await emailService.sendDueDateReminderNotification(
                assignee.email,
                `${assignee.firstName} ${assignee.lastName}`,
                task.title,
                task.project.title,
                task.dueDate,
                daysUntilDue
              );
            }
          }
        }
      }

      console.log(`Due date reminder check completed. Processed ${dueTasks.length} tasks.`);
    } catch (error) {
      console.error('Error checking due date reminders:', error);
    }
  }

  async sendDailyDigest() {
    try {
      console.log('Sending daily digest...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Get all active users
      const users = await User.find({ isActive: true });

      for (const user of users) {
        const digest = await this.generateUserDigest(user._id, yesterday, today);

        if (digest.hasContent) {
          await emailService.sendDigestNotification(
            user.email,
            `${user.firstName} ${user.lastName}`,
            digest
          );
        }
      }

      console.log('Daily digest sent to all users');
    } catch (error) {
      console.error('Error sending daily digest:', error);
    }
  }

  async generateUserDigest(userId, startDate, endDate) {
    try {
      // Get user's projects
      const projects = await Project.find({
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ],
        isArchived: false
      });

      const projectIds = projects.map(p => p._id);

      // Get new tasks assigned to user
      const newTasks = await Card.find({
        assignedTo: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        project: { $in: projectIds }
      }).populate('project', 'title');

      // Get tasks due soon
      const dueSoon = new Date();
      dueSoon.setDate(dueSoon.getDate() + 3);

      const dueTasks = await Card.find({
        assignedTo: userId,
        dueDate: { $lte: dueSoon },
        status: { $nin: ['completed'] },
        project: { $in: projectIds }
      }).populate('project', 'title');

      // Get recent project updates (simplified - could be expanded)
      const projectUpdates = [];

      const digest = {
        newTasks: newTasks.map(task => ({
          title: task.title,
          projectName: task.project.title
        })),
        dueTasks: dueTasks.map(task => ({
          title: task.title,
          dueDate: task.dueDate,
          projectName: task.project.title
        })),
        projectUpdates,
        hasContent: newTasks.length > 0 || dueTasks.length > 0 || projectUpdates.length > 0
      };

      return digest;
    } catch (error) {
      console.error('Error generating user digest:', error);
      return { hasContent: false };
    }
  }

  async handleCardMovedBetweenLists(cardId, sourceListId, targetListId, movedById) {
    try {
      const [card, sourceList, targetList] = await Promise.all([
        Card.findById(cardId),
        List.findById(sourceListId),
        List.findById(targetListId)
      ]);

      if (!card || !sourceList || !targetList) {
        console.error('Missing data for card movement automation');
        return;
      }

      // Auto-update status based on list type
      let newStatus = card.status;

      switch (targetList.listType) {
        case 'todo':
          newStatus = 'open';
          break;
        case 'in_progress':
          newStatus = 'in_progress';
          break;
        case 'review':
          newStatus = 'review';
          break;
        case 'done':
          newStatus = 'completed';
          break;
      }

      // Update card status if it changed
      if (newStatus !== card.status) {
        const oldStatus = card.status;
        card.status = newStatus;
        await card.save();

        console.log(`Card ${card.title} status auto-updated from ${oldStatus} to ${newStatus}`);

        // Send notification about status change
        await this.handleTaskStatusChange(cardId, oldStatus, newStatus, movedById);
      }

      // Check for list-specific automation rules
      await this.processListAutomationRules(card, targetList);

    } catch (error) {
      console.error('Error handling card movement automation:', error);
    }
  }

  async processListAutomationRules(card, list) {
    try {
      if (!list.settings?.autoMove?.enabled || !list.settings.autoMove.conditions) {
        return;
      }

      for (const condition of list.settings.autoMove.conditions) {
        let shouldMove = false;

        switch (condition.field) {
          case 'dueDate':
            if (condition.operator === 'overdue' && card.dueDate && card.dueDate < new Date()) {
              shouldMove = true;
            }
            break;
          case 'checklist':
            if (condition.operator === 'completed' && card.checklistCompletion === 100) {
              shouldMove = true;
            }
            break;
          case 'assignee':
            if (condition.operator === 'equals' && card.assignedTo.includes(condition.value)) {
              shouldMove = true;
            }
            break;
        }

        if (shouldMove && condition.targetList) {
          await card.moveToList(condition.targetList);
          await card.save();
          console.log(`Card ${card.title} auto-moved to list ${condition.targetList} due to automation rule`);
        }
      }
    } catch (error) {
      console.error('Error processing list automation rules:', error);
    }
  }

  async sendWeeklyProjectSummary() {
    try {
      console.log('Sending weekly project summary...');

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get all project managers and owners
      const projects = await Project.find({ isArchived: false })
        .populate('owner', 'firstName lastName email')
        .populate('members.user', 'firstName lastName email');

      for (const project of projects) {
        const summary = await this.generateProjectWeeklySummary(project._id, weekAgo);

        // Send to project owner
        if (project.owner) {
          await this.sendProjectSummaryEmail(
            project.owner.email,
            `${project.owner.firstName} ${project.owner.lastName}`,
            project.title,
            summary
          );
        }

        // Send to project managers
        const projectManagers = project.members.filter(member => member.role === 'project_manager');
        for (const pm of projectManagers) {
          await this.sendProjectSummaryEmail(
            pm.user.email,
            `${pm.user.firstName} ${pm.user.lastName}`,
            project.title,
            summary
          );
        }
      }

      console.log('Weekly project summaries sent');
    } catch (error) {
      console.error('Error sending weekly project summary:', error);
    }
  }

  async generateProjectWeeklySummary(projectId, since) {
    try {
      const [completedTasks, newTasks, totalTasks] = await Promise.all([
        Card.countDocuments({
          project: projectId,
          status: 'completed',
          completedAt: { $gte: since }
        }),
        Card.countDocuments({
          project: projectId,
          createdAt: { $gte: since }
        }),
        Card.countDocuments({
          project: projectId,
          isArchived: false
        })
      ]);

      return {
        completedTasks,
        newTasks,
        totalTasks,
        weekRange: `${since.toLocaleDateString()} - ${new Date().toLocaleDateString()}`
      };
    } catch (error) {
      console.error('Error generating project summary:', error);
      return null;
    }
  }

  async sendProjectSummaryEmail(email, name, projectName, summary) {
    try {
      if (!summary) return;

      const subject = `Weekly Summary: ${projectName}`;
      const content = `
        <p>Hello ${name},</p>
        <p>Here's your weekly summary for project <strong>"${projectName}"</strong>:</p>
        <ul>
          <li>Tasks Completed This Week: ${summary.completedTasks}</li>
          <li>New Tasks Created: ${summary.newTasks}</li>
          <li>Total Active Tasks: ${summary.totalTasks}</li>
        </ul>
        <p>Period: ${summary.weekRange}</p>
      `;

      const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects`;
      const htmlContent = emailService.generateEmailTemplate(subject, content, actionUrl, 'View Projects');

      await emailService.sendEmail(email, subject, htmlContent);
    } catch (error) {
      console.error('Error sending project summary email:', error);
    }
  }

  async handleChecklistUpdate(cardId, userId) {
    const cardIdStr = cardId.toString();
    try {
      // Check if this card is already being processed
      if (this.checklistLocks.has(cardIdStr)) {
        console.log(`Checklist automation already in progress for card ${cardId}, skipping...`);
        return;
      }

      // Lock this card
      this.checklistLocks.add(cardIdStr);
      console.log(`Locked card ${cardId} for checklist automation`);

      // Set a timeout to automatically release the lock after 30 seconds
      setTimeout(() => {
        if (this.checklistLocks.has(cardIdStr)) {
          console.warn(`Force releasing lock for card ${cardId} after timeout`);
          this.checklistLocks.delete(cardIdStr);
        }
      }, 30000);

      const card = await Card.findById(cardId)
        .populate('list', 'title listType')
        .populate('board', 'title');

      if (!card) {
        console.error('Card not found for checklist automation');
        this.checklistLocks.delete(cardIdStr);
        return;
      }

      const checklist = card.checklist || [];
      if (checklist.length === 0) {
        this.checklistLocks.delete(cardIdStr);
        return;
      }

      const completedCount = checklist.filter(item => item.completed).length;
      const completionRate = completedCount / checklist.length;

      console.log(`Card ${card.title} checklist: ${completedCount}/${checklist.length} completed (${Math.round(completionRate * 100)}%)`);

      const List = mongoose.model('List');
      const lists = await List.find({ board: card.board }).sort({ position: 1 });

      let targetListId = null;
      let newStatus = card.status;

      if (completedCount === 0) {
        const todoList = lists.find(list => list.listType === 'todo');
        if (todoList && card.list.toString() !== todoList._id.toString()) {
          targetListId = todoList._id;
          newStatus = 'open';
          console.log(`Moving card ${card.title} to To Do (no subtasks completed)`);
        }
      } else if (completedCount > 0 && completedCount < checklist.length) {
        const inProgressList = lists.find(list => list.listType === 'in_progress');
        if (inProgressList && card.list.toString() !== inProgressList._id.toString()) {
          targetListId = inProgressList._id;
          newStatus = 'in_progress';
          console.log(`Moving card ${card.title} to In Progress (partial completion: ${Math.round(completionRate * 100)}%)`);
        }
      } else if (completedCount === checklist.length) {
        const doneList = lists.find(list => list.listType === 'done');
        if (doneList && card.list.toString() !== doneList._id.toString()) {
          targetListId = doneList._id;
          newStatus = 'completed';
          console.log(`Moving card ${card.title} to Done (all subtasks completed)`);
        }
      }

      if (targetListId) {
        const oldListId = card.list;
        const oldStatus = card.status;

        await card.moveToList(targetListId);
        card.status = newStatus;

        if (newStatus === 'completed') {
          card.completedAt = new Date();
          card.completedBy = userId;
        } else if (oldStatus === 'completed' && newStatus !== 'completed') {
          card.completedAt = null;
          card.completedBy = null;
        }

        await card.save();

        await this.handleCardMovedBetweenLists(cardId, oldListId, targetListId, userId);

        console.log(`Card ${card.title} automatically moved from ${card.list.title} to ${targetListId} due to checklist automation`);
      }

      // Release the lock
      this.checklistLocks.delete(cardIdStr);
      console.log(`Released lock for card ${cardId}`);

    } catch (error) {
      console.error('Error in checklist automation:', error);
      // Release the lock even on error
      this.checklistLocks.delete(cardIdStr);
    }
  }

  async handleNewTaskCreation(cardId, userId) {
    try {
      const card = await Card.findById(cardId)
        .populate('list', 'title listType')
        .populate('board', 'title');

      if (!card) {
        console.error('Card not found for new task automation');
        return;
      }

      const List = mongoose.model('List');
      const lists = await List.find({ board: card.board }).sort({ position: 1 });
      const todoList = lists.find(list => list.listType === 'todo');

      if (todoList && card.list.toString() !== todoList._id.toString()) {
        console.log(`Moving new task ${card.title} to To Do list`);

        const oldListId = card.list;
        await card.moveToList(todoList._id);
        card.status = 'open';
        await card.save();

        console.log(`New task ${card.title} automatically moved to To Do`);
      }

    } catch (error) {
      console.error('Error in new task automation:', error);
    }
  }

  async handleSubtasksAdded(cardId, subtasks, addedById) {
    try {
      const card = await Card.findById(cardId)
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email')
        .populate('watchers', 'firstName lastName email');

      const addedBy = await User.findById(addedById);

      if (!card || !addedBy) {
        console.error('Missing data for subtasks added notification');
        return;
      }

      // Get all users to notify (assignees + watchers, excluding the person who added subtasks)
      const usersToNotify = new Set();

      card.assignedTo.forEach(user => usersToNotify.add(user));
      card.watchers.forEach(user => usersToNotify.add(user));

      // Remove the person who added the subtasks
      const filteredUsers = Array.from(usersToNotify).filter(
        user => user._id.toString() !== addedById.toString()
      );

      for (const user of filteredUsers) {
        await emailService.sendSubtasksAddedNotification(
          user.email,
          `${user.firstName} ${user.lastName}`,
          card.title,
          card.project.title,
          subtasks,
          `${addedBy.firstName} ${addedBy.lastName}`
        );
      }

      console.log(`Subtasks added notifications sent for card ${card.title}`);
    } catch (error) {
      console.error('Error sending subtasks added notification:', error);
    }
  }

  async handleAttachmentAdded(cardId, attachmentName, uploadedById, attachmentType = 'file') {
    try {
      const card = await Card.findById(cardId)
        .populate('project', 'title')
        .populate('assignedTo', 'firstName lastName email')
        .populate('watchers', 'firstName lastName email');

      const uploadedBy = await User.findById(uploadedById);

      if (!card || !uploadedBy) {
        console.error('Missing data for attachment added notification');
        return;
      }

      // Get all users to notify (assignees + watchers, excluding the person who uploaded)
      const usersToNotify = new Set();

      card.assignedTo.forEach(user => usersToNotify.add(user));
      card.watchers.forEach(user => usersToNotify.add(user));

      // Remove the person who uploaded the attachment
      const filteredUsers = Array.from(usersToNotify).filter(
        user => user._id.toString() !== uploadedById.toString()
      );

      for (const user of filteredUsers) {
        await emailService.sendAttachmentAddedNotification(
          user.email,
          `${user.firstName} ${user.lastName}`,
          card.title,
          card.project.title,
          attachmentName,
          `${uploadedBy.firstName} ${uploadedBy.lastName}`,
          attachmentType
        );
      }

      console.log(`Attachment added notifications sent for card ${card.title}`);
    } catch (error) {
      console.error('Error sending attachment added notification:', error);
    }
  }

  async sendDailyDigest() {
    try {
      console.log('Sending daily digest emails...');

      // Get all active users
      const users = await User.find({
        isActive: true,
        emailVerified: true
      }).select('firstName lastName email');

      for (const user of users) {
        try {
          // Get user's assigned tasks
          const assignedTasks = await Card.find({
            assignedTo: user._id,
            status: { $nin: ['completed'] },
            isArchived: false
          })
            .populate('project', 'title')
            .select('title project dueDate');

          // Get tasks due soon (next 7 days)
          const now = new Date();
          const weekFromNow = new Date(now);
          weekFromNow.setDate(weekFromNow.getDate() + 7);

          const dueTasks = assignedTasks.filter(task =>
            task.dueDate && task.dueDate <= weekFromNow
          );

          // Get completed tasks from yesterday
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const completedTasks = await Card.find({
            assignedTo: user._id,
            status: 'completed',
            updatedAt: { $gte: yesterday, $lt: todayStart }
          })
            .populate('project', 'title')
            .select('title project');

          // Get recent comments on user's tasks (last 24 hours)
          const userTaskIds = assignedTasks.map(task => task._id);
          const tasksWithComments = await Card.find({
            _id: { $in: userTaskIds },
            'comments.createdAt': { $gte: yesterday }
          })
            .populate('comments.author', 'firstName lastName')
            .select('title comments');

          const newComments = [];
          tasksWithComments.forEach(task => {
            task.comments.forEach(comment => {
              if (comment.createdAt >= yesterday && comment.author._id.toString() !== user._id.toString()) {
                newComments.push({
                  task: task.title,
                  author: `${comment.author.firstName} ${comment.author.lastName}`,
                  text: comment.text
                });
              }
            });
          });

          const digestData = {
            assignedTasks: assignedTasks.map(task => ({
              title: task.title,
              project: task.project.title
            })),
            dueTasks: dueTasks.map(task => ({
              title: task.title,
              project: task.project.title,
              dueDate: task.dueDate
            })),
            completedTasks: completedTasks.map(task => ({
              title: task.title,
              project: task.project.title
            })),
            newComments: newComments.slice(0, 5) // Limit to 5 most recent
          };

          // Only send digest if there's meaningful content
          if (assignedTasks.length > 0 || dueTasks.length > 0 || completedTasks.length > 0 || newComments.length > 0) {
            await emailService.sendDigestNotification(
              user.email,
              `${user.firstName} ${user.lastName}`,
              digestData
            );

            console.log(`Daily digest sent to ${user.email}`);
          }
        } catch (userError) {
          console.error(`Error sending digest to ${user.email}:`, userError);
          // Continue with other users
        }
      }

      console.log('Daily digest batch completed');
    } catch (error) {
      console.error('Error sending daily digest:', error);
    }
  }

  async sendWeeklyProjectSummary() {
    try {
      console.log('Sending weekly project summaries...');

      // Get all active projects
      const projects = await Project.find({ status: 'active' })
        .populate('members.user', 'firstName lastName email')
        .populate('owner', 'firstName lastName email');

      for (const project of projects) {
        try {
          // Get project statistics for the past week
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const [totalTasks, completedTasks, newTasks] = await Promise.all([
            Card.countDocuments({ project: project._id, isArchived: false }),
            Card.countDocuments({
              project: project._id,
              status: 'completed',
              updatedAt: { $gte: weekAgo }
            }),
            Card.countDocuments({
              project: project._id,
              createdAt: { $gte: weekAgo }
            })
          ]);

          const projectSummary = {
            projectTitle: project.title,
            totalTasks,
            completedTasks,
            newTasks,
            weeklyProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          };

          // Send to project owner and all members
          const recipients = [project.owner, ...project.members.map(m => m.user)];

          for (const recipient of recipients) {
            if (recipient && recipient.email) {
              // For now, we'll use the digest function to send weekly summary
              // You could create a separate weekly summary email template if needed
              console.log(`Weekly summary prepared for ${recipient.email} - Project: ${project.title}`);
            }
          }

        } catch (projectError) {
          console.error(`Error processing project ${project.title}:`, projectError);
          // Continue with other projects
        }
      }

      console.log('Weekly project summary batch completed');
    } catch (error) {
      console.error('Error sending weekly project summaries:', error);
    }
  }
}

module.exports = new AutomationService();