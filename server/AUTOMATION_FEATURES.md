# EUROSHUB Project Management Automation Features

## Overview

This document outlines the comprehensive automation features added to the EUROSHUB project management system. These features enhance user experience by providing automatic notifications, status updates, and periodic summaries.

## Features Implemented

### 1. Email Notification System

#### Email Service Configuration
- **Service**: Nodemailer with SMTP support
- **Supported Providers**: Gmail, Outlook, and other SMTP services
- **Templates**: HTML email templates with responsive design
- **Environment Variables Required**:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  SMTP_FROM=your-email@gmail.com
  APP_NAME=EUROSHUB
  CLIENT_URL=http://localhost:3000
  ```

#### Email Notification Types

1. **Project Member Addition Notifications**
   - Triggered when a user is added to a project
   - Includes project details, role assignment, and direct project link
   - Sent to the newly added member

2. **Task Assignment Notifications**
   - Triggered when tasks are assigned to users
   - Includes task details, due date, and direct task link
   - Sent to all newly assigned users

3. **Task Status Change Notifications**
   - Triggered when task status changes
   - Sent to assignees and watchers (excluding the person who made the change)
   - Includes old/new status and task details

4. **Task Comment Notifications**
   - Triggered when comments are added to tasks
   - Sent to assignees and watchers (excluding the commenter)
   - Includes comment text and task details

5. **Due Date Reminder Notifications**
   - Sent for overdue tasks, tasks due today, tomorrow, or in 3 days
   - Includes urgency indicators and task details
   - Color-coded based on urgency level

6. **Daily Digest Emails**
   - Sent daily at 9 AM
   - Includes new task assignments, due tasks, and project updates
   - Only sent if user has relevant content

7. **Weekly Project Summary**
   - Sent to project owners and managers every Monday at 10 AM
   - Includes tasks completed, new tasks created, and total active tasks

### 2. Automatic Status Updates

#### List-Based Status Updates
When tasks are moved between Kanban columns, their status is automatically updated based on the list type:

- **To Do** (`todo`) → Status: `open`
- **In Progress** (`in_progress`) → Status: `in_progress`
- **Review** (`review`) → Status: `review`
- **Done** (`done`) → Status: `completed`

#### List Automation Rules
Lists can be configured with automation rules that automatically move cards based on conditions:

```javascript
{
  autoMove: {
    enabled: true,
    conditions: [
      {
        field: 'dueDate',
        operator: 'overdue',
        targetList: 'overdue_list_id'
      },
      {
        field: 'checklist',
        operator: 'completed',
        targetList: 'done_list_id'
      }
    ]
  }
}
```

### 3. Scheduled Automation Jobs

#### Cron Job Schedule
- **Daily Digest**: Every day at 9:00 AM
- **Due Date Reminders**: Every hour
- **Weekly Project Summary**: Every Monday at 10:00 AM

#### Job Functions
1. **Daily Digest Generation**: Compiles user-specific activity summaries
2. **Due Date Monitoring**: Identifies and sends reminders for approaching deadlines
3. **Weekly Summaries**: Generates project performance reports

### 4. API Endpoints for Automation Management

#### Available Endpoints

1. **Test Email Configuration**
   ```http
   POST /api/automation/test-email
   ```
   - Tests email service configuration
   - Admin access required

2. **Manual Digest Trigger**
   ```http
   POST /api/automation/send-digest
   ```
   - Manually sends digest to specific user
   - Admin access required

3. **Automation Status**
   ```http
   GET /api/automation/status
   ```
   - Returns current automation service status
   - Shows email configuration and active features

4. **Due Date Check**
   ```http
   POST /api/automation/check-due-dates
   ```
   - Manually triggers due date reminder check
   - Admin access required

5. **Automation Metrics**
   ```http
   GET /api/automation/metrics
   ```
   - Returns automation statistics and metrics
   - Admin access required

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the server directory with the following variables:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# App Configuration
APP_NAME=EUROSHUB
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

### 2. Gmail Setup (Recommended)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated password as `SMTP_PASS`

### 3. Starting the Server

The automation service starts automatically when the server starts:

```bash
cd server
npm install
npm run dev
```

### 4. Testing the Setup

Use the test email endpoint to verify configuration:

```bash
curl -X POST http://localhost:5000/api/automation/test-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@example.com"}'
```

## Technical Implementation

### Services

1. **EmailService** (`/services/emailService.js`)
   - Handles all email operations
   - Provides templating system
   - Manages SMTP configuration

2. **AutomationService** (`/services/automationService.js`)
   - Manages cron jobs
   - Handles automation triggers
   - Processes list automation rules

### Integration Points

1. **Project Routes** (`/routes/projects.js`)
   - Member addition triggers
   - Project update notifications

2. **Card Routes** (`/routes/cards.js`)
   - Task assignment triggers
   - Status change notifications
   - Comment notifications
   - Card movement automation

3. **Socket Events** (`/config/projectSocket.js`)
   - Real-time automation triggers
   - Live notification system

### Database Integration

The automation system integrates with existing models:

- **Card Model**: Enhanced with automation hooks
- **List Model**: Added automation rule support
- **Project Model**: Member management automation
- **Activity Model**: Automation event logging

## Monitoring and Maintenance

### Logging

All automation events are logged with appropriate log levels:
- **Info**: Successful automation triggers
- **Warn**: Configuration issues
- **Error**: Failed automation attempts

### Error Handling

The automation system includes comprehensive error handling:
- Failed email sends don't crash the application
- Automation errors are logged but don't affect core functionality
- Graceful degradation when email service is unavailable

### Performance Considerations

- Automation triggers are non-blocking
- Email sending is asynchronous
- Cron jobs are optimized for minimal database load
- Bulk operations are used where possible

## Future Enhancements

### Planned Features

1. **Slack Integration**
   - Slack notifications for project events
   - Slash commands for project management
   - Channel-based project updates

2. **Microsoft Teams Integration**
   - Teams notifications and bot integration
   - Calendar integration for due dates

3. **Advanced Automation Rules**
   - More complex condition combinations
   - Custom automation scripts
   - Webhook support for external integrations

4. **User Preferences**
   - Individual notification preferences
   - Customizable digest frequency
   - Timezone-aware scheduling

### Configuration Options

Future versions will include:
- Web-based automation configuration UI
- Per-project automation settings
- User-specific notification preferences
- Advanced scheduling options

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check SMTP credentials in `.env`
   - Verify Gmail app password setup
   - Check server logs for specific errors

2. **Automation Not Triggering**
   - Verify cron jobs are running
   - Check automation service initialization
   - Review server startup logs

3. **Performance Issues**
   - Monitor email queue size
   - Check database query performance
   - Review automation job frequency

### Diagnostic Tools

Use the automation status endpoint to diagnose issues:

```bash
curl -X GET http://localhost:5000/api/automation/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This returns comprehensive status information including:
- Email service configuration
- Active cron jobs
- Feature availability
- Error states

## Security Considerations

### Email Security
- SMTP credentials are stored securely in environment variables
- Email templates are sanitized to prevent XSS
- Rate limiting on test email endpoints

### Access Control
- Automation management requires admin privileges
- User data is filtered based on project access
- Sensitive information is excluded from notifications

### Data Privacy
- Email addresses are not logged in automation events
- User preferences respect privacy settings
- GDPR-compliant notification management

## Support and Contact

For issues related to automation features:
1. Check server logs for error messages
2. Verify environment configuration
3. Test email connectivity using the test endpoint
4. Review automation metrics for system health

The automation system is designed to enhance productivity while maintaining system reliability and user privacy.