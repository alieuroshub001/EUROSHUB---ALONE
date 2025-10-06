# Slack Integration Setup Guide

## Overview

Your EUROSHUB application now supports Slack notifications for important events like new user signups and user deletions. You have **two options** for Slack integration:

### Option 1: Incoming Webhooks (Simpler - Recommended)
### Option 2: Slack Bot with Web API (More Features)

---

## Option 1: Incoming Webhooks (Recommended)

This is the easiest way to send notifications to Slack.

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Give your app a name (e.g., "EUROSHUB Notifications")
5. Select your workspace
6. Click **"Create App"**

### Step 2: Enable Incoming Webhooks

1. In your app's settings, click **"Incoming Webhooks"** in the left sidebar
2. Toggle **"Activate Incoming Webhooks"** to **ON**
3. Scroll down and click **"Add New Webhook to Workspace"**
4. Select the channel where you want notifications (e.g., #general, #notifications)
5. Click **"Allow"**
6. **Copy the Webhook URL** (it looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### Step 3: Add to Your .env File

Add this line to your `.env` file:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### That's it! 🎉

Now when a user is created or deleted, you'll get a notification in your Slack channel.

---

## Option 2: Slack Bot with Web API (Advanced)

This option gives you more control and features but requires more setup.

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Give your app a name (e.g., "EUROSHUB Bot")
5. Select your workspace
6. Click **"Create App"**

### Step 2: Add Bot Scopes

1. Click **"OAuth & Permissions"** in the left sidebar
2. Scroll down to **"Scopes"**
3. Under **"Bot Token Scopes"**, click **"Add an OAuth Scope"**
4. Add these scopes:
   - `chat:write` - Post messages to channels
   - `chat:write.public` - Post messages to public channels without joining

### Step 3: Install App to Workspace

1. Scroll up to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"**
3. Click **"Allow"**
4. **Copy the "Bot User OAuth Token"** (it starts with `xoxb-`)

### Step 4: Get Channel ID

1. Open Slack
2. Right-click on the channel where you want notifications
3. Select **"View channel details"**
4. Scroll down and copy the **Channel ID** (it looks like `C01234ABCDE`)

### Step 5: Add to Your .env File

Add these lines to your `.env` file:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C01234ABCDE
```

### That's it! 🎉

---

## Testing Your Setup

After configuring Slack (using either option), restart your server and create a new user. You should see a notification in your Slack channel!

---

## Environment Variables Summary

### For Webhook Method (Option 1):
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### For Bot Method (Option 2):
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_ID=C01234ABCDE
```

### Current Email Settings:
```env
RESEND_API_KEY=re_fUanjfTB_BV7Sis7Dg1pJiCGo1pxCjJsp
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## What Gets Notified?

Currently, Slack notifications are sent for:

✅ **New User Created** - When a superadmin, admin, or HR creates a new user
✅ **User Deleted** - When a user is removed from the system

Each notification includes:
- User's name
- Email
- Role
- Who performed the action
- Timestamp

---

## Troubleshooting

### "Slack not configured" message
- Make sure you've added either `SLACK_WEBHOOK_URL` or both `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` to your `.env` file
- Restart your server after updating `.env`

### Notifications not appearing
- Check that the webhook URL or bot token is correct
- For webhooks: Make sure the channel wasn't deleted
- For bots: Make sure the bot has been invited to the channel (type `/invite @EUROSHUB Bot` in the channel)

### Permission errors
- For bots: Make sure you've added the required scopes (`chat:write` and `chat:write.public`)
- Reinstall the app to workspace after adding scopes

---

## Need Help?

If you encounter any issues, check the server logs for error messages. Slack notifications are non-blocking, so even if they fail, user creation will still succeed.
