# EUROSHUB Automation Setup Guide

## Quick Start (5 minutes)

Your EUROSHUB project management system now includes powerful automation features! Follow these steps to get email notifications and automatic status updates working.

## Step 1: Email Configuration

### Option A: Gmail (Recommended)

1. **Enable 2FA on your Gmail account**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Turn on 2-Step Verification if not already enabled

2. **Create an App Password**
   - In Security settings, click "2-Step Verification"
   - Scroll down to "App passwords"
   - Select "Mail" and "Other (custom name)"
   - Name it "EUROSHUB" and generate the password
   - **Copy this 16-character password - you'll need it below**

3. **Update your environment file**

   Create or update `server/.env` file:
   ```env
   # Your existing config...

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM=your-gmail@gmail.com
   APP_NAME=EUROSHUB
   CLIENT_URL=http://localhost:3000
   ```

### Option B: Other Email Providers

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

## Step 2: Start the Server

```bash
cd server
npm install node-cron  # Install automation dependency
npm run dev
```

## Step 3: Test Email Configuration

1. **Login as an admin** to your EUROSHUB system
2. **Test email** by making this API call (replace `YOUR_JWT_TOKEN`):

```bash
curl -X POST http://localhost:5000/api/automation/test-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Or use the browser console:
```javascript
fetch('/api/automation/test-email', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
}).then(res => res.json()).then(console.log);
```

3. **Check your email** - you should receive a test message!

## What's Now Automated?

### ✅ Email Notifications
- **Member added to project** → Welcome email with project details
- **Task assigned** → Assignment notification with due date
- **Task status changed** → Update notification to watchers
- **Comment added** → Notification to assignees and watchers
- **Due date approaching** → Reminders for overdue, today, tomorrow, 3 days
- **Daily digest** → Daily summary of your tasks and projects (9 AM)
- **Weekly summary** → Project performance for managers (Monday 10 AM)

### ✅ Automatic Status Updates
- **Move to "To Do" column** → Status becomes "Open"
- **Move to "In Progress" column** → Status becomes "In Progress"
- **Move to "Review" column** → Status becomes "Review"
- **Move to "Done" column** → Status becomes "Completed"

## Admin Dashboard

Check automation status anytime:
```bash
curl -X GET http://localhost:5000/api/automation/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Emails not working?

1. **Check server logs** for error messages
2. **Verify Gmail app password** is 16 characters, no spaces
3. **Check .env file** is in the `server/` directory
4. **Restart the server** after changing .env

### Gmail "Less secure app" error?
- Don't use your regular password - use the app password
- Make sure 2FA is enabled first

### Still having issues?
1. Check the `server/AUTOMATION_FEATURES.md` file for detailed troubleshooting
2. Look at server console for specific error messages
3. Try the automation status endpoint to see what's configured

## What's Next?

Your automation is now set up! Here's what you can expect:

- **Immediate**: Status updates when moving tasks between columns
- **Hourly**: Due date reminder checks
- **Daily at 9 AM**: Digest emails for active users
- **Weekly on Monday at 10 AM**: Project summaries for managers

The system will also send notifications in real-time when:
- Someone adds you to a project
- Tasks are assigned to you
- Someone comments on your tasks
- Task statuses change

## Future Automation (Coming Soon)

- 🔄 **Slack Integration** for team notifications
- 📅 **Calendar Integration** for due date sync
- 🎯 **Custom Automation Rules** for advanced workflows
- ⚙️ **User Preferences** for notification control

## Need Help?

- Check the detailed documentation in `server/AUTOMATION_FEATURES.md`
- View automation metrics at `/api/automation/metrics`
- Test different features using the automation API endpoints

Enjoy your automated project management experience! 🚀