const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Initialize Resend if API key is available
let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('📧 Resend initialized as primary email service');
}

// Resend email sending function
const sendEmailViaResend = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !resend) {
    throw new Error('Resend API key not configured');
  }

  // For Railway deployment, use a sandbox domain until you get a custom domain
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject,
    html
  });

  if (error) {
    throw new Error(`Resend API error: ${error.message}`);
  }

  console.log(`📧 Resend email sent successfully to ${to}, ID: ${data.id}`);
  return data;
};

// Universal email sending function with Resend priority
const sendEmail = async (to, subject, html) => {
  try {
    // Try Resend first if available (better for Railway)
    if (process.env.RESEND_API_KEY) {
      try {
        console.log(`📧 Sending via Resend to ${to}...`);
        await sendEmailViaResend(to, subject, html);
        console.log(`📧 Resend success: ${subject} to ${to}`);
        return;
      } catch (resendError) {
        console.error(`📧 Resend failed for ${to}:`, resendError.message);
        // Continue to SMTP fallback
      }
    }

    // Fallback to SMTP (may not work on Railway)
    console.log(`📧 Trying SMTP fallback for ${to}...`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to,
      subject,
      html
    });

    console.log(`📧 SMTP success: ${subject} to ${to}`);
  } catch (error) {
    console.error(`📧 All email methods failed for ${to}:`, error.message);

    // Log helpful debugging info
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USERNAME) {
      console.error('📧 No email service configured. Add RESEND_API_KEY or EMAIL_USERNAME/EMAIL_PASSWORD');
    }

    throw error;
  }
};

const sendWelcomeEmail = async ({ email, firstName, lastName, tempPassword, role, verificationToken }) => {
  console.log(`📧 Sending welcome email to ${email}...`);

  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email/${verificationToken}`;
  const emailSubject = 'Welcome to EurosHub - Account Created';
  const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Welcome to EurosHub</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName},</h2>

          <p style="color: #666; line-height: 1.6;">
            Your account has been created successfully! You've been assigned the role of <strong>${role}</strong> in our project management system.
          </p>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Your Login Credentials:</h3>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email & Login
            </a>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Important Security Notice:</h4>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              Please change your password immediately after your first login for security purposes.
            </p>
          </div>

          <p style="color: #666; line-height: 1.6;">
            If you have any questions or need assistance, please don't hesitate to contact our support team.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

  await sendEmail(email, emailSubject, emailHtml);
};

const sendPasswordResetEmail = async ({ email, firstName, resetToken }) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/${resetToken}`;
  const emailSubject = 'EurosHub - Password Reset Request';
  const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Password Reset Request</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName},</h2>

          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password for your EurosHub account. If you didn't make this request, you can safely ignore this email.
          </p>

          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Security Notice:</h4>
            <ul style="color: #721c24; margin: 0; font-size: 14px; padding-left: 20px;">
              <li>This reset link will expire in 10 minutes</li>
              <li>If you didn't request this reset, please contact support</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <code style="background-color: #f8f9fa; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${resetUrl}</code>
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

  await sendEmail(email, emailSubject, emailHtml);
};

const sendVerificationEmail = async ({ email, firstName, lastName, verificationToken }) => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email/${verificationToken}`;
  const emailSubject = 'EurosHub - Verify Your Email Address';
  const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Verify Your Email</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName},</h2>

          <p style="color: #666; line-height: 1.6;">
            Please verify your email address to complete your account setup and gain access to EurosHub.
          </p>

          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>

          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">Important:</h4>
            <p style="color: #0c5460; margin: 0; font-size: 14px;">
              You must verify your email address before you can log in to your account. If you didn't request this verification, please ignore this email.
            </p>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If the button above doesn't work, you can copy and paste the following link into your browser:<br>
            <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

  await sendEmail(email, emailSubject, emailHtml);
};

// Project member added notification
const sendProjectMemberAddedNotification = async (memberEmail, memberName, projectTitle, projectDescription, inviterName, role = 'member') => {
  console.log(`📧 Sending project member added email to ${memberEmail}...`);

  const projectUrl = `${process.env.CLIENT_URL}/projects`;
  const emailSubject = `You've been added to ${projectTitle}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #007bff; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to the Team!</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${memberName},</h2>

        <p style="color: #666; line-height: 1.6;">
          Great news! <strong>${inviterName}</strong> has added you to the project <strong>"${projectTitle}"</strong> as a <strong>${role}</strong>.
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Project Details:</h3>
          <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0;"><strong>Your Role:</strong> ${role}</p>
          ${projectDescription ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${projectDescription}</p>` : ''}
        </div>

        <div style="margin: 30px 0;">
          <a href="${projectUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Project
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          You can now collaborate with your team, manage tasks, and track project progress. Log in to your EurosHub account to get started!
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(memberEmail, emailSubject, emailHtml);
};

// Task assignment notification
const sendTaskAssignmentNotification = async (assigneeEmail, assigneeName, taskTitle, taskDescription, projectTitle, assignerName, dueDate = null) => {
  console.log(`📧 Sending task assignment email to ${assigneeEmail}...`);

  const taskUrl = `${process.env.CLIENT_URL}/projects`;
  const dueDateText = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date set';
  const emailSubject = `New Task Assigned: ${taskTitle}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #28a745; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Task Assigned</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${assigneeName},</h2>

        <p style="color: #666; line-height: 1.6;">
          <strong>${assignerName}</strong> has assigned you a new task in <strong>${projectTitle}</strong>.
        </p>

        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
          <h3 style="color: #155724; margin: 0 0 15px 0;">Task Details:</h3>
          <p style="margin: 5px 0; color: #155724;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0; color: #155724;"><strong>Due Date:</strong> ${dueDateText}</p>
          ${taskDescription ? `<p style="margin: 5px 0; color: #155724;"><strong>Description:</strong> ${taskDescription}</p>` : ''}
        </div>

        <div style="margin: 30px 0;">
          <a href="${taskUrl}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          Please review the task details and update its progress as you work on it. Your team is counting on you!
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(assigneeEmail, emailSubject, emailHtml);
};

// Due date reminder notification
const sendDueDateReminderNotification = async (assigneeEmail, assigneeName, taskTitle, projectTitle, dueDate, daysDue) => {
  console.log(`📧 Sending due date reminder email to ${assigneeEmail}...`);

  const taskUrl = `${process.env.CLIENT_URL}/projects`;
  const dueDateText = new Date(dueDate).toLocaleDateString();
  const urgencyColor = daysDue < 0 ? '#dc3545' : daysDue <= 1 ? '#fd7e14' : '#ffc107';
  const urgencyText = daysDue < 0 ? 'OVERDUE' : daysDue === 0 ? 'DUE TODAY' : `Due in ${daysDue} day${daysDue === 1 ? '' : 's'}`;

  const emailSubject = daysDue < 0 ? `OVERDUE: ${taskTitle}` : daysDue === 0 ? `Due Today: ${taskTitle}` : `Reminder: ${taskTitle} due soon`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${urgencyColor}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Task Due Date Reminder</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${assigneeName},</h2>

        <p style="color: #666; line-height: 1.6;">
          This is a reminder about your task in <strong>${projectTitle}</strong>.
        </p>

        <div style="background-color: ${urgencyColor}20; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0;">
          <h3 style="color: ${urgencyColor}; margin: 0 0 15px 0; text-transform: uppercase;">${urgencyText}</h3>
          <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateText}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${taskUrl}" style="background-color: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ${daysDue < 0 ? 'Update Task Now' : 'View Task'}
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          ${daysDue < 0
            ? 'This task is overdue. Please update its status or complete it as soon as possible.'
            : daysDue === 0
            ? 'This task is due today. Make sure to complete it before the end of the day.'
            : 'Please plan to complete this task before the due date.'}
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(assigneeEmail, emailSubject, emailHtml);
};

// Task comment notification
const sendTaskCommentNotification = async (recipientEmail, recipientName, commenterName, taskTitle, projectTitle, commentText, taskId = null) => {
  console.log(`📧 Sending task comment notification to ${recipientEmail}...`);

  const taskUrl = taskId ? `${process.env.CLIENT_URL}/projects` : `${process.env.CLIENT_URL}/projects`;
  const emailSubject = `New comment on: ${taskTitle}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #17a2b8; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Comment</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${recipientName},</h2>

        <p style="color: #666; line-height: 1.6;">
          <strong>${commenterName}</strong> left a comment on the task <strong>"${taskTitle}"</strong> in <strong>${projectTitle}</strong>.
        </p>

        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin: 0 0 15px 0;">Comment:</h3>
          <p style="margin: 0; color: #0c5460; font-style: italic;">"${commentText}"</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0;"><strong>Commented by:</strong> ${commenterName}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${taskUrl}" style="background-color: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task & Reply
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          Stay connected with your team and keep the conversation going!
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(recipientEmail, emailSubject, emailHtml);
};

// Task status change notification
const sendTaskStatusChangeNotification = async (recipientEmail, recipientName, taskTitle, projectTitle, oldStatus, newStatus, changedByName) => {
  console.log(`📧 Sending task status change notification to ${recipientEmail}...`);

  const taskUrl = `${process.env.CLIENT_URL}/projects`;
  const statusColor = newStatus === 'completed' ? '#28a745' : newStatus === 'in_progress' ? '#fd7e14' : '#6c757d';
  const emailSubject = `Task Status Updated: ${taskTitle}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Task Status Updated</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${recipientName},</h2>

        <p style="color: #666; line-height: 1.6;">
          <strong>${changedByName}</strong> has updated the status of <strong>"${taskTitle}"</strong> in <strong>${projectTitle}</strong>.
        </p>

        <div style="background-color: ${statusColor}20; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0;">
          <h3 style="color: ${statusColor}; margin: 0 0 15px 0;">Status Change:</h3>
          <p style="margin: 5px 0;"><strong>From:</strong> <span style="text-transform: capitalize;">${oldStatus.replace('_', ' ')}</span></p>
          <p style="margin: 5px 0;"><strong>To:</strong> <span style="text-transform: capitalize; color: ${statusColor}; font-weight: bold;">${newStatus.replace('_', ' ')}</span></p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0;"><strong>Updated by:</strong> ${changedByName}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${taskUrl}" style="background-color: ${statusColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task Details
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          ${newStatus === 'completed'
            ? '🎉 Congratulations! This task has been completed.'
            : newStatus === 'in_progress'
            ? '⚡ Work is now in progress on this task.'
            : 'The task status has been updated.'}
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(recipientEmail, emailSubject, emailHtml);
};

// Subtasks added notification
const sendSubtasksAddedNotification = async (recipientEmail, recipientName, taskTitle, projectTitle, subtasks, addedByName) => {
  console.log(`📧 Sending subtasks added notification to ${recipientEmail}...`);

  const taskUrl = `${process.env.CLIENT_URL}/projects`;
  const subtasksList = subtasks.map(subtask => `<li style="margin: 5px 0;">${subtask.text}</li>`).join('');
  const emailSubject = `New subtasks added to: ${taskTitle}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #6f42c1; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Subtasks Added</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${recipientName},</h2>

        <p style="color: #666; line-height: 1.6;">
          <strong>${addedByName}</strong> has added ${subtasks.length} new subtask${subtasks.length === 1 ? '' : 's'} to <strong>"${taskTitle}"</strong> in <strong>${projectTitle}</strong>.
        </p>

        <div style="background-color: #f3e8ff; border-left: 4px solid #6f42c1; padding: 20px; margin: 20px 0;">
          <h3 style="color: #553c9a; margin: 0 0 15px 0;">New Subtasks:</h3>
          <ul style="margin: 0; color: #553c9a; padding-left: 20px;">
            ${subtasksList}
          </ul>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0;"><strong>Added by:</strong> ${addedByName}</p>
          <p style="margin: 5px 0;"><strong>Total subtasks:</strong> ${subtasks.length}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${taskUrl}" style="background-color: #6f42c1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Task & Subtasks
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          Track your progress by checking off subtasks as you complete them!
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(recipientEmail, emailSubject, emailHtml);
};

// Attachment added notification
const sendAttachmentAddedNotification = async (recipientEmail, recipientName, taskTitle, projectTitle, attachmentName, uploadedByName, attachmentType = 'file') => {
  console.log(`📧 Sending attachment added notification to ${recipientEmail}...`);

  const taskUrl = `${process.env.CLIENT_URL}/projects`;
  const iconColor = attachmentType === 'image' ? '#e83e8c' : '#fd7e14';
  const iconEmoji = attachmentType === 'image' ? '🖼️' : '📎';
  const emailSubject = `New ${attachmentType} added to: ${taskTitle}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${iconColor}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${iconEmoji} New ${attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)} Added</h1>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${recipientName},</h2>

        <p style="color: #666; line-height: 1.6;">
          <strong>${uploadedByName}</strong> has added a new ${attachmentType} to the task <strong>"${taskTitle}"</strong> in <strong>${projectTitle}</strong>.
        </p>

        <div style="background-color: ${iconColor}20; border-left: 4px solid ${iconColor}; padding: 20px; margin: 20px 0;">
          <h3 style="color: ${iconColor}; margin: 0 0 15px 0;">${attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)} Details:</h3>
          <p style="margin: 5px 0; color: ${iconColor};"><strong>Name:</strong> ${attachmentName}</p>
          <p style="margin: 5px 0; color: ${iconColor};"><strong>Type:</strong> ${attachmentType}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
          <p style="margin: 5px 0;"><strong>Uploaded by:</strong> ${uploadedByName}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${taskUrl}" style="background-color: ${iconColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View ${attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1)} & Task
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          ${attachmentType === 'image'
            ? 'View the image and any related details in the task.'
            : 'Download and review the file when convenient.'}
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail(recipientEmail, emailSubject, emailHtml);
};

// Daily digest notification
const sendDigestNotification = async (recipientEmail, recipientName, digestData) => {
  console.log(`📧 Sending daily digest email to ${recipientEmail}...`);

  const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;
  const {
    assignedTasks = [],
    dueTasks = [],
    completedTasks = [],
    newComments = [],
    projectUpdates = []
  } = digestData;

  const emailSubject = `Your EurosHub Daily Digest - ${new Date().toLocaleDateString()}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #343a40; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">📊 Daily Digest</h1>
        <p style="color: #adb5bd; margin: 5px 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="padding: 30px; background-color: white;">
        <h2 style="color: #333;">Hello ${recipientName},</h2>

        <p style="color: #666; line-height: 1.6;">
          Here's your daily summary of activities and tasks in EurosHub.
        </p>

        <!-- Tasks Summary -->
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 15px 0;">📋 Task Summary</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="text-align: center; padding: 10px; background: #d4edda; border-radius: 5px;">
              <strong style="color: #155724; font-size: 18px;">${assignedTasks.length}</strong>
              <br><span style="color: #155724; font-size: 12px;">Assigned</span>
            </div>
            <div style="text-align: center; padding: 10px; background: #fff3cd; border-radius: 5px;">
              <strong style="color: #856404; font-size: 18px;">${dueTasks.length}</strong>
              <br><span style="color: #856404; font-size: 12px;">Due Soon</span>
            </div>
            <div style="text-align: center; padding: 10px; background: #d1ecf1; border-radius: 5px;">
              <strong style="color: #0c5460; font-size: 18px;">${completedTasks.length}</strong>
              <br><span style="color: #0c5460; font-size: 12px;">Completed</span>
            </div>
          </div>
        </div>

        ${dueTasks.length > 0 ? `
        <!-- Due Tasks -->
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 15px 0;">⏰ Tasks Due Soon</h3>
          ${dueTasks.slice(0, 3).map(task => `
            <p style="margin: 5px 0; color: #856404;">• ${task.title} - ${task.project}</p>
          `).join('')}
          ${dueTasks.length > 3 ? `<p style="margin: 5px 0; color: #856404; font-style: italic;">...and ${dueTasks.length - 3} more</p>` : ''}
        </div>
        ` : ''}

        ${newComments.length > 0 ? `
        <!-- New Comments -->
        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin: 0 0 15px 0;">💬 Recent Comments</h3>
          ${newComments.slice(0, 3).map(comment => `
            <p style="margin: 5px 0; color: #0c5460;">• ${comment.author} commented on "${comment.task}"</p>
          `).join('')}
          ${newComments.length > 3 ? `<p style="margin: 5px 0; color: #0c5460; font-style: italic;">...and ${newComments.length - 3} more</p>` : ''}
        </div>
        ` : ''}

        <div style="margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Dashboard
          </a>
        </div>

        <p style="color: #666; line-height: 1.6; font-size: 14px;">
          Stay productive and keep your projects on track! 💪
        </p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        <p style="margin: 5px 0; font-size: 12px;">
          <a href="#" style="color: #666;">Unsubscribe</a> |
          <a href="#" style="color: #666;">Email Preferences</a>
        </p>
      </div>
    </div>
  `;

  await sendEmail(recipientEmail, emailSubject, emailHtml);
};

const generateEmailTemplate = (subject, content, actionUrl = '', actionText = '') => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${subject}</h2>
      <div>${content}</div>
      ${actionUrl ? `<a href="${actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${actionText}</a>` : ''}
    </div>
  `;
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendDueDateReminderNotification,
  sendProjectMemberAddedNotification,
  sendTaskAssignmentNotification,
  sendTaskStatusChangeNotification,
  sendTaskCommentNotification,
  sendSubtasksAddedNotification,
  sendAttachmentAddedNotification,
  sendDigestNotification,
  generateEmailTemplate,
  sendEmail
};