const axios = require('axios');

// Frontend API base URL (will be deployed on Vercel)
const FRONTEND_API_URL = process.env.FRONTEND_API_URL || 'http://localhost:3000/api/emails';

// Generic function to call frontend email API
const callFrontendEmailAPI = async (endpoint, data) => {
  try {
    console.log(`📧 Calling frontend email API: ${endpoint}`);
    const response = await axios.post(`${FRONTEND_API_URL}/${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 second timeout
    });

    console.log(`📧 Frontend email API success: ${response.data.message}`);
    return response.data;
  } catch (error) {
    console.error(`📧 Frontend email API error (${endpoint}):`, error.response?.data || error.message);

    // Provide helpful error details
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Frontend email service is not reachable. Check if it\'s deployed and FRONTEND_API_URL is set correctly.');
    }

    throw new Error(`Email service error: ${error.response?.data?.error || error.message}`);
  }
};

const sendWelcomeEmail = async ({ email, firstName, lastName, tempPassword, role, verificationToken }) => {
  console.log(`📧 Sending welcome email to ${email}...`);

  const data = {
    email,
    firstName,
    lastName,
    tempPassword,
    role,
    verificationToken
  };

  return await callFrontendEmailAPI('welcome', data);
};

const sendPasswordResetEmail = async ({ email, firstName, resetToken }) => {
  console.log(`📧 Sending password reset email to ${email}...`);

  const data = {
    email,
    firstName,
    resetToken
  };

  return await callFrontendEmailAPI('password-reset', data);
};

const sendVerificationEmail = async ({ email, firstName, lastName, verificationToken }) => {
  console.log(`📧 Sending verification email to ${email}...`);

  const data = {
    to: email,
    subject: 'EurosHub - Verify Your Email Address',
    html: generateVerificationEmailHTML(firstName, lastName, verificationToken)
  };

  return await callFrontendEmailAPI('send', data);
};

const sendProjectMemberAddedNotification = async (memberEmail, memberName, projectTitle, projectDescription, inviterName, role = 'member') => {
  console.log(`📧 Sending project member added email to ${memberEmail}...`);

  const data = {
    memberEmail,
    memberName,
    projectTitle,
    projectDescription,
    inviterName,
    role
  };

  return await callFrontendEmailAPI('project-member', data);
};

const sendTaskAssignmentNotification = async (assigneeEmail, assigneeName, taskTitle, taskDescription, projectTitle, assignerName, dueDate = null) => {
  console.log(`📧 Sending task assignment email to ${assigneeEmail}...`);

  const data = {
    assigneeEmail,
    assigneeName,
    taskTitle,
    taskDescription,
    projectTitle,
    assignerName,
    dueDate
  };

  return await callFrontendEmailAPI('task-assignment', data);
};

// Helper function to generate verification email HTML
const generateVerificationEmailHTML = (firstName, lastName, verificationToken) => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://euroshub-alone.vercel.app';
  const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

  return `
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
};

// Generic send email function
const sendEmail = async (to, subject, html) => {
  const data = { to, subject, html };
  return await callFrontendEmailAPI('send', data);
};

// Admin password reset notification
const notifyAdminsPasswordResetRequest = async ({ userEmail, userName, userRole, requestId }) => {
  console.log(`📧 Sending admin notification for password reset request from ${userEmail} (${userRole})...`);

  // Get eligible admins based on user role (simplified version)
  const eligibleAdmins = [
    { email: 'ali.rayyan001@gmail.com', name: 'Ali Rayyan', role: 'superadmin' }
  ];

  const data = {
    userEmail,
    userName,
    userRole,
    requestId,
    eligibleAdmins
  };

  return await callFrontendEmailAPI('admin-password-reset', data);
};

// Add other notification functions with empty implementations for now
const sendDueDateReminderNotification = async () => {
  console.log('📧 Due date reminder notifications not yet implemented via frontend API');
};

const sendTaskStatusChangeNotification = async () => {
  console.log('📧 Task status change notifications not yet implemented via frontend API');
};

const sendTaskCommentNotification = async () => {
  console.log('📧 Task comment notifications not yet implemented via frontend API');
};

const sendSubtasksAddedNotification = async () => {
  console.log('📧 Subtasks added notifications not yet implemented via frontend API');
};

const sendAttachmentAddedNotification = async () => {
  console.log('📧 Attachment added notifications not yet implemented via frontend API');
};

const sendDigestNotification = async () => {
  console.log('📧 Digest notifications not yet implemented via frontend API');
};

const sendPasswordResetSuccess = async () => {
  console.log('📧 Password reset success notifications not yet implemented via frontend API');
};

const sendPasswordResetRejected = async () => {
  console.log('📧 Password reset rejected notifications not yet implemented via frontend API');
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
  notifyAdminsPasswordResetRequest,
  sendPasswordResetSuccess,
  sendPasswordResetRejected,
  generateEmailTemplate,
  sendEmail
};