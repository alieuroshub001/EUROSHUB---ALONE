const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { sendVerificationDM } = require('./slackService');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Nodemailer (Gmail fallback)
let nodemailerTransport = null;
if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
  nodemailerTransport = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  console.log('✅ Nodemailer fallback configured');
}

/**
 * Send email with Resend, fallback to Nodemailer if it fails
 */
const sendEmailWithFallback = async ({ to, subject, html }) => {
  let method = 'none';
  let error = null;

  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`📧 Attempting to send email via Resend to ${to}...`);
      const { data, error: resendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to,
        subject,
        html
      });

      if (resendError) {
        throw new Error(`Resend failed: ${resendError.message}`);
      }

      console.log(`✅ Email sent via Resend to ${to}`);
      return { success: true, method: 'resend', data };
    } catch (resendError) {
      console.warn(`⚠️ Resend failed for ${to}:`, resendError.message);
      error = resendError;
      method = 'resend-failed';
    }
  }

  // Fallback to Nodemailer (Gmail)
  if (nodemailerTransport) {
    try {
      console.log(`📧 Attempting to send email via Nodemailer (Gmail) to ${to}...`);
      const info = await nodemailerTransport.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
        to,
        subject,
        html
      });

      console.log(`✅ Email sent via Nodemailer (Gmail) to ${to}`);
      return { success: true, method: 'nodemailer', data: info };
    } catch (nodemailerError) {
      console.error(`❌ Nodemailer also failed for ${to}:`, nodemailerError.message);
      throw new Error(`Both email services failed. Resend: ${error?.message || 'Not configured'}. Nodemailer: ${nodemailerError.message}`);
    }
  }

  // If we get here, both services are not configured or failed
  throw new Error(`Email service not configured. Resend error: ${error?.message || 'Not configured'}. Nodemailer: Not configured.`);
};

/**
 * Send welcome email to newly created user
 */
const sendWelcomeEmail = async ({ email, firstName, lastName, tempPassword, role, verificationToken }) => {
  try {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .credentials { background-color: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${process.env.APP_NAME || 'EUROSHUB'}!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>

            <p>Your account has been created successfully with the role: <strong>${role}</strong></p>

            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            </div>

            <p>Before you can log in, please verify your email address by clicking the button below:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <p style="margin-top: 20px;">After verifying your email, you can log in and change your password from your profile settings.</p>

            <p style="color: #dc2626; font-size: 14px;">⚠️ For security reasons, please change your password after your first login.</p>

            <div class="footer">
              <p>If you didn't request this account, please ignore this email.</p>
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'EUROSHUB'}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to both Gmail and Slack
    const emailResult = await sendEmailWithFallback({
      to: email,
      subject: `Welcome to ${process.env.APP_NAME || 'EUROSHUB'}`,
      html
    });

    // Also send verification link via Slack DM (non-blocking)
    sendVerificationDM({ email, firstName, lastName, verificationToken }).catch(err => {
      console.warn('⚠️ Failed to send verification via Slack, but email was sent:', err.message);
    });

    return emailResult;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Send email verification
 */
const sendVerificationEmail = async ({ email, firstName, lastName, verificationToken }) => {
  try {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>

            <p>Please verify your email address by clicking the button below:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Or copy and paste this link in your browser:<br>
              <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${verificationUrl}</code>
            </p>

            <div class="footer">
              <p>If you didn't request this verification, please ignore this email.</p>
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'EUROSHUB'}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to both Gmail and Slack
    const emailResult = await sendEmailWithFallback({
      to: email,
      subject: `Verify Your Email - ${process.env.APP_NAME || 'EUROSHUB'}`,
      html
    });

    // Also send verification link via Slack DM (non-blocking)
    sendVerificationDM({ email, firstName, lastName, verificationToken }).catch(err => {
      console.warn('⚠️ Failed to send verification via Slack, but email was sent:', err.message);
    });

    return emailResult;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async ({ email, firstName, resetToken }) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName}</strong>,</p>

            <p>You requested a password reset. Click the button below to reset your password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <div class="warning">
              <p style="margin: 0;"><strong>⏰ This link will expire in 10 minutes.</strong></p>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Or copy and paste this link in your browser:<br>
              <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; word-break: break-all;">${resetUrl}</code>
            </p>

            <div class="footer">
              <p>If you didn't request this password reset, please ignore this email.</p>
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'EUROSHUB'}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithFallback({
      to: email,
      subject: `Password Reset Request - ${process.env.APP_NAME || 'EUROSHUB'}`,
      html
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Notify admins about password reset request
 */
const notifyAdminsPasswordResetRequest = async ({ userEmail, userName, userRole, requestId }) => {
  try {
    const adminUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/password-reset-requests`;
    const adminEmail = process.env.ADMIN_OTP_EMAIL;

    if (!adminEmail) {
      console.warn('⚠️ ADMIN_OTP_EMAIL not configured, skipping admin notification');
      return null;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info-box { background-color: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Password Reset Request</h1>
          </div>
          <div class="content">
            <p>A user has requested a password reset:</p>

            <div class="info-box">
              <p><strong>Name:</strong> ${userName}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Role:</strong> ${userRole}</p>
              <p><strong>Request ID:</strong> ${requestId}</p>
            </div>

            <p>Please review and process this request:</p>

            <div style="text-align: center;">
              <a href="${adminUrl}" class="button">View Requests</a>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'EUROSHUB'}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithFallback({
      to: adminEmail,
      subject: `New Password Reset Request - ${process.env.APP_NAME || 'EUROSHUB'}`,
      html
    });
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    throw error;
  }
};

/**
 * Send password reset success notification
 */
const sendPasswordResetSuccess = async ({ email, firstName, lastName, newPassword, processorName }) => {
  try {
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .credentials { background-color: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Reset Approved</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>

            <p>Your password reset request has been approved by <strong>${processorName}</strong>.</p>

            <div class="credentials">
              <h3>Your New Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>New Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${newPassword}</code></p>
            </div>

            <p>You can now log in with your new password:</p>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Log In</a>
            </div>

            <p style="color: #dc2626; font-size: 14px; margin-top: 20px;">⚠️ For security reasons, please change your password after logging in.</p>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'EUROSHUB'}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithFallback({
      to: email,
      subject: `Password Reset Approved - ${process.env.APP_NAME || 'EUROSHUB'}`,
      html
    });
  } catch (error) {
    console.error('Error sending password reset success email:', error);
    throw error;
  }
};

/**
 * Send password reset rejection notification
 */
const sendPasswordResetRejected = async ({ email, firstName, lastName, reason, processorName }) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .reason-box { background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request Declined</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName} ${lastName}</strong>,</p>

            <p>Your password reset request has been declined by <strong>${processorName}</strong>.</p>

            <div class="reason-box">
              <p><strong>Reason:</strong></p>
              <p>${reason}</p>
            </div>

            <p>If you believe this is a mistake or need further assistance, please contact your administrator.</p>

            <div class="footer">
              <p>© ${new Date().getFullYear()} ${process.env.APP_NAME || 'EUROSHUB'}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmailWithFallback({
      to: email,
      subject: `Password Reset Request Declined - ${process.env.APP_NAME || 'EUROSHUB'}`,
      html
    });
  } catch (error) {
    console.error('Error sending password reset rejection email:', error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  notifyAdminsPasswordResetRequest,
  sendPasswordResetSuccess,
  sendPasswordResetRejected
};
