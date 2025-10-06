# Slack Multi-Channel Setup Guide

## Overview

Your EUROSHUB application now supports **multiple Slack channels** for different types of notifications! You can route notifications to specific channels based on the event type.

---

## Available Notification Types

| Channel Type | Notifications | Example Events |
|-------------|---------------|----------------|
| **users** 🧑‍💼 | User management | User created, User deleted |
| **projects** 📁 | Project updates | Project created, Project updated |
| **tasks** 📋 | Task management | Task assigned, Status changed |
| **alerts** 🚨 | System alerts | Critical errors, Security issues |
| **reports** 📊 | Daily/weekly reports | User activity, Project summaries |

---

## Setup Options

### Option 1: Single Channel (Current Setup) ✅ **Simplest**

All notifications go to one channel.

**.env Configuration:**
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

This is what you currently have configured!

---

### Option 2: Multiple Channels with Webhooks 🎯 **Recommended**

Different webhooks for different channels.

#### Step 1: Create Slack Channels

In your Slack workspace, create these channels:
- `#user-management`
- `#projects`
- `#tasks`
- `#system-alerts`
- `#reports`

#### Step 2: Create Incoming Webhooks

For each channel:

1. Go to https://api.slack.com/apps
2. Select your **EUROSHUB Notifications** app
3. Click **"Incoming Webhooks"**
4. Click **"Add New Webhook to Workspace"**
5. Select the channel (e.g., `#user-management`)
6. Copy the webhook URL

Repeat for each channel you want to use.

#### Step 3: Add to .env

```env
# Single channel fallback (required)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T09.../default

# Specific channels (optional - falls back to SLACK_WEBHOOK_URL if not set)
SLACK_WEBHOOK_USERS=https://hooks.slack.com/services/T09.../users
SLACK_WEBHOOK_PROJECTS=https://hooks.slack.com/services/T09.../projects
SLACK_WEBHOOK_TASKS=https://hooks.slack.com/services/T09.../tasks
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/T09.../alerts
SLACK_WEBHOOK_REPORTS=https://hooks.slack.com/services/T09.../reports
```

**Note:** If you don't set a specific webhook, it will use `SLACK_WEBHOOK_URL` as fallback.

---

### Option 3: Multiple Channels with Bot API 🤖 **Most Features**

Use a single bot that can post to any channel.

#### Step 1: Configure Bot Permissions

1. Go to https://api.slack.com/apps
2. Select your app
3. Go to **"OAuth & Permissions"**
4. Under **"Bot Token Scopes"**, add:
   - `chat:write` - Post messages
   - `chat:write.public` - Post to public channels without joining
   - `users:read` - Look up users by email (for DMs)
   - `users:read.email` - Read user emails (for DMs)

5. Click **"Reinstall to Workspace"**
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

#### Step 2: Get Channel IDs

For each channel:

1. Right-click on the channel in Slack
2. Select **"View channel details"**
3. Scroll down and copy the **Channel ID** (e.g., `C01234ABCDE`)

#### Step 3: Add to .env

```env
# Bot Token
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Default channel (required)
SLACK_CHANNEL_ID=C01234ABCDE

# Specific channels (optional - falls back to SLACK_CHANNEL_ID if not set)
SLACK_CHANNEL_USERS=C01234ABCDE
SLACK_CHANNEL_PROJECTS=C09876FGHIJ
SLACK_CHANNEL_TASKS=C05432KLMNO
SLACK_CHANNEL_ALERTS=C08765PQRST
SLACK_CHANNEL_REPORTS=C01928UVWXY
```

**Note:** The bot must be invited to private channels. Type `/invite @EUROSHUB Bot` in the channel.

---

## Current Notifications

### User Management Notifications

**Channel:** `users` (or default)

**Events:**
- ✅ New user created
- ✅ User deleted

**Example Configuration:**
```env
SLACK_WEBHOOK_USERS=https://hooks.slack.com/services/YOUR/USERS/WEBHOOK
```

---

## Adding More Notifications (Future)

The slack service now includes these additional functions ready to use:

### 1. Project Notifications

```javascript
await slackService.notifyProjectCreated({
  projectTitle: 'New Website',
  description: 'Build company website',
  owner: 'John Doe',
  members: '5 members'
});
```

### 2. Task Notifications

```javascript
await slackService.notifyTaskAssigned({
  taskTitle: 'Design homepage',
  assignedTo: 'Jane Smith',
  assignedBy: 'John Doe',
  dueDate: '2025-01-15',
  projectName: 'New Website'
});
```

### 3. Alert Notifications

```javascript
await slackService.sendAlert({
  title: 'Database Connection Lost',
  message: 'Unable to connect to MongoDB',
  severity: 'critical' // 'critical', 'error', or 'warning'
});
```

### 4. Direct Messages (Requires Bot API)

```javascript
await slackService.sendDirectMessage(
  'user@example.com',
  'Hello! Your task is overdue.'
);
```

**Note:** DM feature requires:
- `SLACK_BOT_TOKEN` configured
- Bot scopes: `users:read` and `users:read.email`
- User must be in your Slack workspace

---

## Environment Variables Reference

### Minimal Setup (What You Have Now)
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T09JSCFSV53/B09JSCYHVPX/...
```

### Full Multi-Channel Setup (Webhooks)
```env
# Fallback webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T09.../default

# Channel-specific webhooks
SLACK_WEBHOOK_USERS=https://hooks.slack.com/services/T09.../users
SLACK_WEBHOOK_PROJECTS=https://hooks.slack.com/services/T09.../projects
SLACK_WEBHOOK_TASKS=https://hooks.slack.com/services/T09.../tasks
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/T09.../alerts
SLACK_WEBHOOK_REPORTS=https://hooks.slack.com/services/T09.../reports
```

### Full Multi-Channel Setup (Bot API)
```env
# Bot token
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Channel IDs
SLACK_CHANNEL_ID=C01234ABCDE              # Fallback
SLACK_CHANNEL_USERS=C01234ABCDE
SLACK_CHANNEL_PROJECTS=C09876FGHIJ
SLACK_CHANNEL_TASKS=C05432KLMNO
SLACK_CHANNEL_ALERTS=C08765PQRST
SLACK_CHANNEL_REPORTS=C01928UVWXY
```

---

## Testing

After configuration, restart your server and:

1. **Test user notifications:** Create or delete a user
2. **Check correct channel:** Verify message appears in the right channel

---

## Troubleshooting

### Messages go to wrong channel
- Verify channel ID or webhook URL is correct
- Make sure you configured the right variable name (`SLACK_WEBHOOK_USERS` not `SLACK_WEBHOOK_USER`)

### Bot cannot post to channel
- Invite bot to private channels: `/invite @EUROSHUB Bot`
- Verify bot has `chat:write` and `chat:write.public` scopes

### Direct messages not working
- Verify `SLACK_BOT_TOKEN` is set
- Add `users:read` and `users:read.email` scopes
- User must exist in your Slack workspace

---

## Summary

**Current Setup:** ✅ Single channel for all notifications

**Recommended Next Step:**
1. Create `#user-management` channel
2. Get webhook for that channel
3. Add `SLACK_WEBHOOK_USERS` to `.env`
4. Keep `SLACK_WEBHOOK_URL` as fallback

This gives you organized notifications without too much complexity! 🎉
