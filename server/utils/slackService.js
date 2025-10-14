const { WebClient } = require('@slack/web-api');

// Initialize Slack client (only if token is provided)
const slackToken = process.env.SLACK_BOT_TOKEN;

// Support for multiple channels (fallback to default if specific channel not set)
const slackChannels = {
  default: process.env.SLACK_CHANNEL_ID,
  users: process.env.SLACK_CHANNEL_USERS || process.env.SLACK_CHANNEL_ID,
  activity: process.env.SLACK_CHANNEL_ACTIVITY || process.env.SLACK_CHANNEL_ID,
  projects: process.env.SLACK_CHANNEL_PROJECTS || process.env.SLACK_CHANNEL_ID,
  tasks: process.env.SLACK_CHANNEL_TASKS || process.env.SLACK_CHANNEL_ID,
  alerts: process.env.SLACK_CHANNEL_ALERTS || process.env.SLACK_CHANNEL_ID,
  reports: process.env.SLACK_CHANNEL_REPORTS || process.env.SLACK_CHANNEL_ID,
  boards: process.env.SLACK_CHANNEL_BOARDS || process.env.SLACK_CHANNEL_ID,
  'board-management': process.env.SLACK_CHANNEL_BOARD_MANAGEMENT || process.env.SLACK_CHANNEL_BOARDS || process.env.SLACK_CHANNEL_ID
};

// Support for multiple webhooks (fallback to default if specific webhook not set)
const slackWebhooks = {
  default: process.env.SLACK_WEBHOOK_URL,
  users: process.env.SLACK_WEBHOOK_USERS || process.env.SLACK_WEBHOOK_URL,
  projects: process.env.SLACK_WEBHOOK_PROJECTS || process.env.SLACK_WEBHOOK_URL,
  tasks: process.env.SLACK_WEBHOOK_TASKS || process.env.SLACK_WEBHOOK_URL,
  alerts: process.env.SLACK_WEBHOOK_ALERTS || process.env.SLACK_WEBHOOK_URL,
  reports: process.env.SLACK_WEBHOOK_REPORTS || process.env.SLACK_WEBHOOK_URL,
  boards: process.env.SLACK_WEBHOOK_BOARDS || process.env.SLACK_WEBHOOK_URL,
  'board-management': process.env.SLACK_WEBHOOK_BOARD_MANAGEMENT || process.env.SLACK_WEBHOOK_BOARDS || process.env.SLACK_WEBHOOK_URL
};

let slackClient = null;
if (slackToken) {
  slackClient = new WebClient(slackToken);
}

/**
 * Send message to specific Slack channel
 * @param {string} channelType - Type of channel (users, projects, tasks, alerts, reports, default)
 * @param {object} message - Slack message object with blocks
 */
const sendToChannel = async (channelType, message) => {
  const webhookUrl = slackWebhooks[channelType];
  const channelId = slackChannels[channelType];

  // Use webhook if available (simpler), otherwise use Web API
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    console.log(`✅ Slack notification sent to ${channelType} channel via webhook`);
    return { success: true, method: 'webhook', channel: channelType };
  } else if (slackClient && channelId) {
    const result = await slackClient.chat.postMessage({
      channel: channelId,
      ...message
    });

    console.log(`✅ Slack notification sent to ${channelType} channel via Web API`);
    return { success: true, method: 'api', channel: channelType, data: result };
  }

  return null;
};

/**
 * Send a notification to Slack when a new user signs up
 */
const notifyNewUserSignup = async ({ firstName, lastName, email, role, createdBy }) => {
  try {
    // Skip if Slack is not configured
    if (!slackWebhooks.users && !slackChannels.users) {
      console.log('⚠️ Slack users channel not configured, skipping notification');
      return null;
    }

    const message = {
      text: `New User Created: ${firstName} ${lastName} (${email})`, // Fallback text for notifications
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '👤 New User Created',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:*\n${firstName} ${lastName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${email}`
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${role}`
            },
            {
              type: 'mrkdwn',
              text: `*Created By:*\n${createdBy}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('users', message);
  } catch (error) {
    console.error('❌ Error sending Slack notification:', error);
    // Don't throw - we don't want to break user creation if Slack fails
    return { success: false, error: error.message };
  }
};

/**
 * Send a notification to Slack when a user is deleted
 */
const notifyUserDeleted = async ({ firstName, lastName, email, role, deletedBy }) => {
  try {
    if (!slackWebhooks.users && !slackChannels.users) {
      console.log('⚠️ Slack users channel not configured, skipping notification');
      return null;
    }

    const message = {
      text: `User Deleted: ${firstName} ${lastName} (${email})`, // Fallback text for notifications
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🗑️ User Deleted',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:*\n${firstName} ${lastName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${email}`
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${role}`
            },
            {
              type: 'mrkdwn',
              text: `*Deleted By:*\n${deletedBy}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('users', message);
  } catch (error) {
    console.error('❌ Error sending Slack notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a notification when a new project is created
 */
const notifyProjectCreated = async ({ projectTitle, description, owner, members }) => {
  try {
    if (!slackWebhooks.projects && !slackChannels.projects) {
      console.log('⚠️ Slack projects channel not configured, skipping notification');
      return null;
    }

    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📁 New Project Created',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${projectTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Owner:*\n${owner}`
            },
            {
              type: 'mrkdwn',
              text: `*Members:*\n${members || 'None yet'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${description || 'No description'}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('projects', message);
  } catch (error) {
    console.error('❌ Error sending Slack notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a notification when a task is assigned
 */
const notifyTaskAssigned = async ({ taskTitle, assignedTo, assignedBy, dueDate, projectName }) => {
  try {
    if (!slackWebhooks.tasks && !slackChannels.tasks) {
      console.log('⚠️ Slack tasks channel not configured, skipping notification');
      return null;
    }

    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 New Task Assignment',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Task:*\n${taskTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Project:*\n${projectName}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned To:*\n${assignedTo}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned By:*\n${assignedBy}`
            },
            {
              type: 'mrkdwn',
              text: `*Due Date:*\n${dueDate || 'Not set'}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('tasks', message);
  } catch (error) {
    console.error('❌ Error sending Slack notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a critical alert notification
 */
const sendAlert = async ({ title, message, severity = 'warning' }) => {
  try {
    if (!slackWebhooks.alerts && !slackChannels.alerts) {
      console.log('⚠️ Slack alerts channel not configured, skipping notification');
      return null;
    }

    const emoji = severity === 'critical' ? '🚨' : severity === 'error' ? '❌' : '⚠️';

    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${title}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Severity: *${severity.toUpperCase()}* | 🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('alerts', slackMessage);
  } catch (error) {
    console.error('❌ Error sending Slack alert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a custom notification to any channel
 */
const sendCustomNotification = async (channelType = 'default', message) => {
  try {
    if (!slackWebhooks[channelType] && !slackChannels[channelType]) {
      console.log(`⚠️ Slack ${channelType} channel not configured, skipping notification`);
      return null;
    }

    const slackMessage = typeof message === 'string'
      ? { text: message }
      : message;

    return await sendToChannel(channelType, slackMessage);
  } catch (error) {
    console.error('❌ Error sending Slack notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send direct message to a Slack user (requires Bot API)
 */
const sendDirectMessage = async (userEmail, message) => {
  try {
    if (!slackClient) {
      console.log('⚠️ Slack Bot not configured, cannot send DM');
      return null;
    }

    // Look up user by email
    const userResult = await slackClient.users.lookupByEmail({ email: userEmail });

    if (!userResult.ok) {
      throw new Error(`User not found: ${userEmail}`);
    }

    const userId = userResult.user.id;

    // Send DM (message can be string or blocks object)
    const messagePayload = typeof message === 'string'
      ? { channel: userId, text: message }
      : { channel: userId, ...message };

    const result = await slackClient.chat.postMessage(messagePayload);

    console.log(`✅ Direct message sent to ${userEmail}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error sending Slack DM:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome DM with credentials to new user
 */
const sendWelcomeDM = async ({ email, firstName, lastName, tempPassword, role, createdBy, loginUrl }) => {
  try {
    if (!slackClient) {
      console.log('⚠️ Slack Bot not configured, cannot send DM');
      return null;
    }

    const message = {
      text: `Welcome to EUROSHUB! Your account has been created.`, // Fallback text
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎉 Welcome to EUROSHUB!',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi *${firstName} ${lastName}*! 👋\n\nYour EUROSHUB account has been created by *${createdBy}*.`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*🔐 Your Login Credentials*'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Email:*\n\`${email}\``
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${role}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Temporary Password:*\n\`${tempPassword}\``
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🌐 *<${loginUrl}|Click here to login to EUROSHUB>*`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '⚠️ *Security Note:* Please change your password after your first login.'
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `📧 A copy of these credentials has also been sent to your email: ${email}`
            }
          ]
        }
      ]
    };

    return await sendDirectMessage(email, message);
  } catch (error) {
    console.error('❌ Error sending welcome DM:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification when user logs in
 */
const notifyUserLogin = async ({ firstName, lastName, email, role, ipAddress, userAgent }) => {
  try {
    if (!slackWebhooks.activity && !slackChannels.activity) {
      console.log('⚠️ Slack activity channel not configured, skipping notification');
      return null;
    }

    const message = {
      text: `User Login: ${firstName} ${lastName} (${email})`, // Fallback text
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔓 User Logged In',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:*\n${firstName} ${lastName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${email}`
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${role}`
            },
            {
              type: 'mrkdwn',
              text: `*IP Address:*\n${ipAddress || 'Unknown'}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()} | 🌐 ${userAgent || 'Unknown browser'}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('activity', message);
  } catch (error) {
    console.error('❌ Error sending Slack login notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification when user logs out
 */
const notifyUserLogout = async ({ firstName, lastName, email, role }) => {
  try {
    if (!slackWebhooks.activity && !slackChannels.activity) {
      console.log('⚠️ Slack activity channel not configured, skipping notification');
      return null;
    }

    const message = {
      text: `User Logout: ${firstName} ${lastName} (${email})`, // Fallback text
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔒 User Logged Out',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Name:*\n${firstName} ${lastName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${email}`
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${role}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    return await sendToChannel('activity', message);
  } catch (error) {
    console.error('❌ Error sending Slack logout notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email verification link via Slack DM
 */
const sendVerificationDM = async ({ email, firstName, lastName, verificationToken }) => {
  try {
    if (!slackClient) {
      console.log('⚠️ Slack Bot not configured, cannot send DM');
      return null;
    }

    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    const message = {
      text: `Verify your email address for EUROSHUB`, // Fallback text
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✉️ Email Verification Required',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi *${firstName} ${lastName}*! 👋\n\nPlease verify your email address to activate your EUROSHUB account.`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔗 *<${verificationUrl}|Click here to verify your email>*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Or copy and paste this link in your browser:\n\`${verificationUrl}\``
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '📧 A verification link has also been sent to your email address.'
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: "If you didn't request this verification, please ignore this message."
            }
          ]
        }
      ]
    };

    return await sendDirectMessage(email, message);
  } catch (error) {
    console.error('❌ Error sending verification DM:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification when a member is added to a board
 */
const notifyBoardMemberAdded = async ({ boardName, memberName, memberEmail, addedBy, role, boardId }) => {
  try {
    if (!slackWebhooks['board-management'] && !slackChannels['board-management']) {
      console.log('⚠️ Slack board-management channel not configured, skipping notification');
      return null;
    }

    const message = {
      text: `New Member Added to Board: ${memberName} added to ${boardName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '👥 Board Member Added',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Board:*\n${boardName}`
            },
            {
              type: 'mrkdwn',
              text: `*Member:*\n${memberName}`
            },
            {
              type: 'mrkdwn',
              text: `*Email:*\n${memberEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Role:*\n${role}`
            },
            {
              type: 'mrkdwn',
              text: `*Added By:*\n${addedBy}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    // Send to board management channel
    const channelResult = await sendToChannel('board-management', message);

    // Also send DM to the new member if possible
    if (memberEmail) {
      const welcomeMessage = {
        text: `Welcome to ${boardName}! You've been added as a ${role}.`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🎉 Added to Board',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Hi ${memberName}! 👋\n\nYou've been added to the board *${boardName}* as a *${role}* by *${addedBy}*.`
            }
          },
          {
            type: 'divider'
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `🕒 ${new Date().toLocaleString()}`
              }
            ]
          }
        ]
      };

      const dmResult = await sendDirectMessage(memberEmail, welcomeMessage);

      return {
        channelNotification: channelResult,
        directMessage: dmResult
      };
    }

    return { channelNotification: channelResult, directMessage: null };
  } catch (error) {
    console.error('❌ Error sending board member added notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification when a task is assigned to a user in a board
 */
const notifyBoardTaskAssigned = async ({ taskTitle, assignedTo, assignedBy, dueDate, boardName, cardName, assignedToEmail }) => {
  try {
    if (!slackWebhooks['board-management'] && !slackChannels['board-management']) {
      console.log('⚠️ Slack board-management channel not configured, skipping notification');
      return null;
    }

    const message = {
      text: `Task Assigned: ${taskTitle} assigned to ${assignedTo} in ${boardName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 Board Task Assignment',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Task:*\n${taskTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Card:*\n${cardName}`
            },
            {
              type: 'mrkdwn',
              text: `*Board:*\n${boardName}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned To:*\n${assignedTo}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned By:*\n${assignedBy}`
            },
            {
              type: 'mrkdwn',
              text: `*Due Date:*\n${dueDate || 'Not set'}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    // Send to board management channel
    const channelResult = await sendToChannel('board-management', message);

    // Also send DM to the assigned user
    if (assignedToEmail) {
      const taskNotificationMessage = {
        text: `New task assigned: ${taskTitle}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📋 New Task Assignment',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Hi ${assignedTo}! 👋\n\nYou've been assigned a new task: *${taskTitle}*`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Card:*\n${cardName}`
              },
              {
                type: 'mrkdwn',
                text: `*Board:*\n${boardName}`
              },
              {
                type: 'mrkdwn',
                text: `*Due Date:*\n${dueDate || 'Not set'}`
              },
              {
                type: 'mrkdwn',
                text: `*Assigned By:*\n${assignedBy}`
              }
            ]
          },
          {
            type: 'divider'
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `🕒 ${new Date().toLocaleString()}`
              }
            ]
          }
        ]
      };

      const dmResult = await sendDirectMessage(assignedToEmail, taskNotificationMessage);

      return {
        channelNotification: channelResult,
        directMessage: dmResult
      };
    }

    return { channelNotification: channelResult, directMessage: null };
  } catch (error) {
    console.error('❌ Error sending board task assignment notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification when a task is unlocked and assigned to users
 */
const notifyBoardTaskUnlocked = async ({ taskTitle, assignedTo, boardName, cardName, unlockedBy, assignedToEmails = [] }) => {
  try {
    if (!slackWebhooks['board-management'] && !slackChannels['board-management']) {
      console.log('⚠️ Slack board-management channel not configured, skipping notification');
      return null;
    }

    const assignedToNames = Array.isArray(assignedTo) ? assignedTo.join(', ') : assignedTo;

    const message = {
      text: `Task Unlocked: ${taskTitle} is now available for ${assignedToNames}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔓 Task Unlocked & Assigned',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Task:*\n${taskTitle}`
            },
            {
              type: 'mrkdwn',
              text: `*Card:*\n${cardName}`
            },
            {
              type: 'mrkdwn',
              text: `*Board:*\n${boardName}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned To:*\n${assignedToNames}`
            },
            {
              type: 'mrkdwn',
              text: `*Unlocked By:*\n${unlockedBy || 'System'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*✅ This task was automatically unlocked after its dependency was completed.*'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    // Send to board management channel
    const channelResult = await sendToChannel('board-management', message);

    // Send DMs to all assigned users
    const dmResults = [];
    if (assignedToEmails && assignedToEmails.length > 0) {
      const assignedUsers = Array.isArray(assignedTo) ? assignedTo : [assignedTo];

      for (let i = 0; i < assignedToEmails.length; i++) {
        const email = assignedToEmails[i];
        const name = assignedUsers[i] || assignedUsers[0];

        const taskUnlockedMessage = {
          text: `Task unlocked and assigned: ${taskTitle}`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🔓 Task Unlocked!',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Hi ${name}! 👋\n\nA task that was waiting on dependencies is now available: *${taskTitle}*`
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Card:*\n${cardName}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Board:*\n${boardName}`
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*✅ All dependencies have been completed - you can now start working on this task!*'
              }
            },
            {
              type: 'divider'
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `🕒 ${new Date().toLocaleString()}`
                }
              ]
            }
          ]
        };

        const dmResult = await sendDirectMessage(email, taskUnlockedMessage);
        dmResults.push(dmResult);
      }
    }

    return {
      channelNotification: channelResult,
      directMessages: dmResults
    };
  } catch (error) {
    console.error('❌ Error sending board task unlocked notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  notifyNewUserSignup,
  notifyUserDeleted,
  notifyProjectCreated,
  notifyTaskAssigned,
  sendAlert,
  sendCustomNotification,
  sendDirectMessage,
  sendWelcomeDM,
  notifyUserLogin,
  notifyUserLogout,
  sendVerificationDM,
  notifyBoardMemberAdded,
  notifyBoardTaskAssigned,
  notifyBoardTaskUnlocked
};
