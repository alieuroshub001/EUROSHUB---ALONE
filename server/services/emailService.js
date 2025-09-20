const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    try {
      // Use only Gmail service - no SMTP configuration
      this.transporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        },
        // Add timeout to prevent hanging
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });

      console.log('✅ Email service configured (Gmail)');

      // Remove the verify() call that was causing timeout
      // this.transporter.verify() was blocking startup
    } catch (error) {
      console.error('⚠️  Email service setup failed:', error.message);
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not configured');
      }

      const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME;
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'EUROSHUB'}" <${fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: htmlContent,
        text: textContent || this.htmlToText(htmlContent)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  htmlToText(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  generateEmailTemplate(title, content, actionUrl = null, actionText = null) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${process.env.APP_NAME || 'EUROSHUB'}</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            ${content}
            ${actionUrl && actionText ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ''}
          </div>
          <div class="footer">
            <p>This is an automated message from ${process.env.APP_NAME || 'EUROSHUB'} Project Management System.</p>
            <p>If you have any questions, please contact your project administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendProjectMemberAddedNotification(memberEmail, memberName, projectName, projectId, addedByName, role) {
    const subject = `You've been added to project: ${projectName}`;
    const content = `
      <p>Hello ${memberName},</p>
      <p><strong>${addedByName}</strong> has added you to the project <strong>"${projectName}"</strong> with the role of <strong>${role}</strong>.</p>
      <p>You can now access the project and start collaborating with your team.</p>
      <ul>
        <li>Project: ${projectName}</li>
        <li>Your Role: ${role}</li>
        <li>Added by: ${addedByName}</li>
      </ul>
    `;

    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}`;
    const htmlContent = this.generateEmailTemplate(subject, content, actionUrl, 'View Project');

    return this.sendEmail(memberEmail, subject, htmlContent);
  }

  async sendTaskAssignmentNotification(assigneeEmail, assigneeName, taskTitle, taskId, projectName, projectId, assignedByName, dueDate = null) {
    const subject = `New task assigned: ${taskTitle}`;
    const dueDateText = dueDate ? `<li>Due Date: ${new Date(dueDate).toLocaleDateString()}</li>` : '';

    const content = `
      <p>Hello ${assigneeName},</p>
      <p><strong>${assignedByName}</strong> has assigned you a new task in project <strong>"${projectName}"</strong>.</p>
      <ul>
        <li>Task: ${taskTitle}</li>
        <li>Project: ${projectName}</li>
        <li>Assigned by: ${assignedByName}</li>
        ${dueDateText}
      </ul>
      <p>Please review the task details and start working on it when you're ready.</p>
    `;

    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}?card=${taskId}`;
    const htmlContent = this.generateEmailTemplate(subject, content, actionUrl, 'View Task');

    return this.sendEmail(assigneeEmail, subject, htmlContent);
  }

  async sendDueDateReminderNotification(assigneeEmail, assigneeName, taskTitle, taskId, projectName, projectId, dueDate) {
    const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntilDue <= 0 ? 'OVERDUE' : daysUntilDue === 1 ? 'DUE TODAY' : `DUE IN ${daysUntilDue} DAYS`;

    const subject = `Task reminder: ${taskTitle} - ${urgencyText}`;

    const content = `
      <p>Hello ${assigneeName},</p>
      <p>This is a reminder about your task <strong>"${taskTitle}"</strong> in project <strong>"${projectName}"</strong>.</p>
      <div style="background-color: ${daysUntilDue <= 0 ? '#fee2e2' : daysUntilDue <= 1 ? '#fef3c7' : '#e0f2fe'}; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <strong style="color: ${daysUntilDue <= 0 ? '#dc2626' : daysUntilDue <= 1 ? '#d97706' : '#0369a1'};">
          ${urgencyText}
        </strong>
      </div>
      <ul>
        <li>Task: ${taskTitle}</li>
        <li>Project: ${projectName}</li>
        <li>Due Date: ${new Date(dueDate).toLocaleDateString()}</li>
      </ul>
      <p>Please update the task status or complete it as soon as possible.</p>
    `;

    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}?card=${taskId}`;
    const htmlContent = this.generateEmailTemplate(subject, content, actionUrl, 'View Task');

    return this.sendEmail(assigneeEmail, subject, htmlContent);
  }

  async sendTaskStatusChangeNotification(userEmail, userName, taskTitle, taskId, projectName, projectId, oldStatus, newStatus, changedByName) {
    const subject = `Task status updated: ${taskTitle}`;

    const content = `
      <p>Hello ${userName},</p>
      <p><strong>${changedByName}</strong> has updated the status of task <strong>"${taskTitle}"</strong> in project <strong>"${projectName}"</strong>.</p>
      <ul>
        <li>Task: ${taskTitle}</li>
        <li>Project: ${projectName}</li>
        <li>Previous Status: ${oldStatus}</li>
        <li>New Status: ${newStatus}</li>
        <li>Changed by: ${changedByName}</li>
      </ul>
    `;

    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}?card=${taskId}`;
    const htmlContent = this.generateEmailTemplate(subject, content, actionUrl, 'View Task');

    return this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendTaskCommentNotification(userEmail, userName, taskTitle, taskId, projectName, projectId, commentText, commentorName) {
    const subject = `New comment on: ${taskTitle}`;

    const content = `
      <p>Hello ${userName},</p>
      <p><strong>${commentorName}</strong> has added a comment to task <strong>"${taskTitle}"</strong> in project <strong>"${projectName}"</strong>.</p>
      <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0;">
        <p><strong>Comment:</strong></p>
        <p style="margin: 0;">${commentText}</p>
      </div>
      <ul>
        <li>Task: ${taskTitle}</li>
        <li>Project: ${projectName}</li>
        <li>Commented by: ${commentorName}</li>
      </ul>
    `;

    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/projects/${projectId}?card=${taskId}`;
    const htmlContent = this.generateEmailTemplate(subject, content, actionUrl, 'View Task');

    return this.sendEmail(userEmail, subject, htmlContent);
  }

  async sendDigestNotification(userEmail, userName, digest) {
    const subject = `Daily Project Digest - ${new Date().toLocaleDateString()}`;

    let content = `<p>Hello ${userName},</p><p>Here's your daily project digest:</p>`;

    if (digest.newTasks && digest.newTasks.length > 0) {
      content += `<h3>New Tasks Assigned (${digest.newTasks.length})</h3><ul>`;
      digest.newTasks.forEach(task => {
        content += `<li>${task.title} - ${task.projectName}</li>`;
      });
      content += `</ul>`;
    }

    if (digest.dueTasks && digest.dueTasks.length > 0) {
      content += `<h3>Tasks Due Soon (${digest.dueTasks.length})</h3><ul>`;
      digest.dueTasks.forEach(task => {
        content += `<li>${task.title} - Due: ${new Date(task.dueDate).toLocaleDateString()}</li>`;
      });
      content += `</ul>`;
    }

    if (digest.projectUpdates && digest.projectUpdates.length > 0) {
      content += `<h3>Project Updates (${digest.projectUpdates.length})</h3><ul>`;
      digest.projectUpdates.forEach(update => {
        content += `<li>${update.description} in ${update.projectName}</li>`;
      });
      content += `</ul>`;
    }

    const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard`;
    const htmlContent = this.generateEmailTemplate(subject, content, actionUrl, 'View Dashboard');

    return this.sendEmail(userEmail, subject, htmlContent);
  }
}

module.exports = new EmailService();