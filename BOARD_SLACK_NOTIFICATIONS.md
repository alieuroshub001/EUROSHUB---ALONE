# Board Module Slack Notifications

This document outlines all the Slack notification integrations implemented for the board management system.

## Overview

The board module now sends comprehensive Slack notifications for all major board actions, ensuring team members stay informed about important updates both in management channels and via direct messages.

## Channel Configuration

The system supports multiple Slack channels through environment variables:

```env
# Primary board management channel
SLACK_CHANNEL_BOARD_MANAGEMENT=C1234567890

# General boards channel (fallback)
SLACK_CHANNEL_BOARDS=C0987654321

# Webhook alternatives
SLACK_WEBHOOK_BOARD_MANAGEMENT=https://hooks.slack.com/services/...
SLACK_WEBHOOK_BOARDS=https://hooks.slack.com/services/...
```

## Notification Actions

### 1. Board Member Added

**Trigger:** When a user is added to a board
**Files:** `server/routes/trello-boards.js`
**Function:** `slackService.notifyBoardMemberAdded()`

**Channel Notification Includes:**
- Board name
- New member name and email
- Role assigned (owner, admin, member, viewer)
- Who added them
- Timestamp

**Direct Message Includes:**
- Welcome message to the new member
- Board name and their role
- Who added them
- Timestamp

### 2. Task Assignment (Initial Creation)

**Trigger:** When a task is created with assigned users
**Files:** `server/routes/trello-cards.js` (POST /:cardId/tasks)
**Function:** `slackService.notifyBoardTaskAssigned()`

**Channel Notification Includes:**
- Task title
- Card name
- Board name
- Assigned user(s)
- Who assigned it
- Due date (if set)
- Timestamp

**Direct Message Includes:**
- Task assignment notification
- Task details (title, card, board)
- Due date
- Who assigned it
- Timestamp

### 3. Task Assignment (Updates)

**Trigger:** When a task's assignedTo field is updated
**Files:** `server/routes/trello-cards.js` (PUT /:cardId/tasks/:taskId)
**Function:** `slackService.notifyBoardTaskAssigned()`

**Same notification structure as initial creation**

### 4. Task Unlocked & Auto-Assigned

**Trigger:** When a task is unlocked due to dependency completion and has auto-assignment enabled
**Files:** `server/routes/trello-cards.js` (PUT /:cardId/tasks/:taskId)
**Function:** `slackService.notifyBoardTaskUnlocked()`

**Channel Notification Includes:**
- Task title
- Card name
- Board name
- Assigned user(s)
- Who unlocked it (or "System")
- Dependency completion notice
- Timestamp

**Direct Message Includes:**
- Task unlocked notification
- Task details (title, card, board)
- Dependency completion explanation
- "Ready to start" message
- Timestamp

## Implementation Details

### Service Functions

#### `notifyBoardMemberAdded(params)`
```javascript
{
  boardName: string,
  memberName: string,
  memberEmail: string,
  addedBy: string,
  role: string,
  boardId: string
}
```

#### `notifyBoardTaskAssigned(params)`
```javascript
{
  taskTitle: string,
  assignedTo: string,
  assignedBy: string,
  dueDate: string | null,
  boardName: string,
  cardName: string,
  assignedToEmail: string
}
```

#### `notifyBoardTaskUnlocked(params)`
```javascript
{
  taskTitle: string,
  assignedTo: string[] | string,
  boardName: string,
  cardName: string,
  unlockedBy: string,
  assignedToEmails: string[]
}
```

### Error Handling

All Slack notifications are sent asynchronously using `.catch()` to prevent blocking the main application flow. Errors are logged but don't affect the core functionality:

```javascript
slackService.notifyBoardMemberAdded(params).catch(error => {
  console.error('❌ Failed to send board member added notification:', error);
});
```

### Channel Priority

The system uses this channel priority:
1. `SLACK_CHANNEL_BOARD_MANAGEMENT` (dedicated board management channel)
2. `SLACK_CHANNEL_BOARDS` (general boards channel)
3. `SLACK_CHANNEL_ID` (default channel)

### Webhook Priority

For webhooks, the system follows the same pattern:
1. `SLACK_WEBHOOK_BOARD_MANAGEMENT`
2. `SLACK_WEBHOOK_BOARDS`
3. `SLACK_WEBHOOK_URL`

## Message Formats

### Channel Messages
All channel messages use Slack Block Kit format with:
- Header block with emoji and action type
- Section blocks with organized field information
- Context block with timestamp

### Direct Messages
Direct messages include:
- Personalized greeting using user's name
- Clear action description
- Relevant details in organized sections
- Professional but friendly tone

## Integration Points

### Board Member Management
- **Route:** `POST /api/boards/:boardId/members`
- **Action:** Add member to board
- **Notifications:** Channel + DM to new member

### Task Creation
- **Route:** `POST /api/cards/:cardId/tasks`
- **Action:** Create task with initial assignments
- **Notifications:** Channel + DM to assigned users

### Task Updates
- **Route:** `PUT /api/cards/:cardId/tasks/:taskId`
- **Actions:**
  - Task assignment changes
  - Task completion (triggers unlocking)
- **Notifications:** Channel + DM for assignments, Channel + DM for unlocked tasks

## Environment Setup

To enable board Slack notifications, configure these environment variables:

```env
# Required: Slack Bot Token for direct messages
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Option 1: Use dedicated board management channel
SLACK_CHANNEL_BOARD_MANAGEMENT=C1234567890

# Option 2: Use webhooks
SLACK_WEBHOOK_BOARD_MANAGEMENT=https://hooks.slack.com/services/...

# Fallback to general channels if specific ones aren't set
SLACK_CHANNEL_BOARDS=C0987654321
SLACK_WEBHOOK_BOARDS=https://hooks.slack.com/services/...
```

## Testing

To test notifications:
1. Set up a test Slack workspace
2. Configure channels and webhooks
3. Add members to boards
4. Create and assign tasks
5. Complete tasks with dependencies to trigger unlocking

## Future Enhancements

Potential additional notifications:
- Board creation/deletion
- Card creation with board members
- Task completion notifications
- Deadline reminders
- Board activity summaries
- Member role changes
- Board visibility changes

## Troubleshooting

**No notifications received:**
1. Check environment variables are set
2. Verify Slack channels/webhooks are valid
3. Check server logs for error messages
4. Ensure bot has proper permissions

**DMs not working:**
1. Verify `SLACK_BOT_TOKEN` is set
2. Check bot is installed in workspace
3. Ensure bot can lookup users by email
4. Verify users exist in Slack workspace

**Channel notifications not working:**
1. Check channel IDs are correct
2. Verify webhook URLs are active
3. Ensure bot is added to channels (for API method)
4. Check webhook permissions