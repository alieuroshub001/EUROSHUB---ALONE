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

// Stub functions for automation services
const sendDueDateReminderNotification = async () => {
  console.log('📧 Due date reminder email (stubbed)');
};

const sendProjectMemberAddedNotification = async () => {
  console.log('📧 Project member added email (stubbed)');
};

const sendTaskAssignmentNotification = async () => {
  console.log('📧 Task assignment email (stubbed)');
};

const sendTaskStatusChangeNotification = async () => {
  console.log('📧 Task status change email (stubbed)');
};

const sendTaskCommentNotification = async () => {
  console.log('📧 Task comment email (stubbed)');
};

const sendDigestNotification = async () => {
  console.log('📧 Digest email (stubbed)');
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
  sendDigestNotification,
  generateEmailTemplate,
  sendEmail
};