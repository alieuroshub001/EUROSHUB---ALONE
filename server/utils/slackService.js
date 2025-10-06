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
  reports: process.env.SLACK_CHANNEL_REPORTS || process.env.SLACK_CHANNEL_ID
};

// Support for multiple webhooks (fallback to default if specific webhook not set)
const slackWebhooks = {
  default: process.env.SLACK_WEBHOOK_URL,
  users: process.env.SLACK_WEBHOOK_USERS || process.env.SLACK_WEBHOOK_URL,
  projects: process.env.SLACK_WEBHOOK_PROJECTS || process.env.SLACK_WEBHOOK_URL,
  tasks: process.env.SLACK_WEBHOOK_TASKS || process.env.SLACK_WEBHOOK_URL,
  alerts: process.env.SLACK_WEBHOOK_ALERTS || process.env.SLACK_WEBHOOK_URL,
  reports: process.env.SLACK_WEBHOOK_REPORTS || process.env.SLACK_WEBHOOK_URL
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
  notifyUserLogout
};
