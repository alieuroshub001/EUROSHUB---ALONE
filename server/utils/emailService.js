const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Initialize Resend if API key is available
let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('📧 Resend initialized as backup email service');
}

// Resend email sending function
const sendEmailViaResend = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY || !resend) {
    throw new Error('Resend API key not configured');
  }

  const fromEmail = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'noreply@euroshub.com';

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

const createTransporter = () => {
  try {
    console.log('📧 Creating email transporter...');
    console.log('📧 Email service:', process.env.EMAIL_SERVICE);
    console.log('📧 Email username:', process.env.EMAIL_USERNAME ? 'SET' : 'NOT SET');
    console.log('📧 Email password:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
    console.log('📧 SMTP_PORT env var:', process.env.SMTP_PORT || 'NOT SET');
    console.log('📧 NODE_ENV:', process.env.NODE_ENV);

    if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
      console.error('📧 Missing email credentials');
      return null;
    }

    // Try different SMTP configurations for Railway compatibility
    const smtpConfig = {
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      // Enhanced timeout configuration for Railway
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 60000,
      socketTimeout: 60000,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    };

    // Try different SMTP configurations based on Railway constraints
    if (process.env.NODE_ENV === 'production') {
      // Try alternative ports that Railway might allow
      const railwayPorts = [2587, 2525, 25, 465, 587];
      const selectedPort = process.env.SMTP_PORT || 2587;

      console.log(`📧 Raw SMTP_PORT value: '${process.env.SMTP_PORT}'`);
      console.log(`📧 Selected port: ${selectedPort}`);
      console.log(`📧 Port after parseInt: ${parseInt(selectedPort)}`);

      Object.assign(smtpConfig, {
        host: 'smtp.gmail.com',
        port: parseInt(selectedPort),
        secure: selectedPort == 465, // SSL for 465, TLS for others
        pool: false,
        maxConnections: 1,
        ignoreTLS: false,
        requireTLS: selectedPort != 465
      });

      console.log(`📧 Final SMTP config before transporter:`, {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        requireTLS: smtpConfig.requireTLS
      });
    } else {
      // Development configuration
      Object.assign(smtpConfig, {
        service: 'gmail',
        port: 587,
        secure: false,
        requireTLS: true
      });
    }

    console.log(`📧 Using SMTP config:`, {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      service: smtpConfig.service
    });

    const transporter = nodemailer.createTransport(smtpConfig);

    console.log('📧 Email transporter created successfully');

    // Test the connection (non-blocking)
    setImmediate(async () => {
      try {
        await transporter.verify();
        console.log('📧 Email connection verified successfully');
      } catch (verifyError) {
        console.error('📧 Email connection verification failed:', verifyError.message);
      }
    });

    return transporter;
  } catch (error) {
    console.error('📧 Email transporter creation failed:', error.message);
    return null;
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

  try {
    const transporter = createTransporter();

    if (!transporter) {
      throw new Error('Email transporter not available');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: emailSubject,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error(`📧 SMTP failed for ${email}:`, error.message);

    // Try Resend as fallback
    if (process.env.RESEND_API_KEY) {
      try {
        console.log(`📧 Trying Resend fallback for ${email}...`);
        await sendEmailViaResend(email, emailSubject, emailHtml);
        console.log(`📧 Resend fallback successful for ${email}`);
        return; // Success with Resend
      } catch (resendError) {
        console.error(`📧 Resend fallback failed for ${email}:`, resendError.message);
      }
    }

    throw error;
  }
};

const sendPasswordResetEmail = async ({ email, firstName, resetToken }) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'EurosHub - Password Reset Request',
    html: `
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
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendAccountDeactivationEmail = async ({ email, firstName, reason }) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'EurosHub - Account Status Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Account Status Update</h1>
        </div>
        
        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName},</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We're writing to inform you that your EurosHub account has been deactivated.
          </p>
          
          ${reason ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">Reason:</h4>
              <p style="color: #666; margin: 0;">${reason}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            If you believe this is an error or have questions about your account status, please contact your administrator or our support team.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async ({ email, firstName, lastName, verificationToken }) => {
  const transporter = createTransporter();

  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email/${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'EurosHub - Verify Your Email Address',
    html: `
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
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset request notification to admins
const notifyAdminsPasswordResetRequest = async ({ userEmail, userName, userRole, requestId }) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL || 'admin@euroshub.com', // Configure admin emails
    subject: 'EurosHub - New Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Password Reset Request</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">New Password Reset Request</h2>

          <p style="color: #666; line-height: 1.6;">
            A user has requested a password reset and requires administrator approval.
          </p>

          <div style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
            <h4 style="color: #007bff; margin: 0 0 10px 0;">Request Details:</h4>
            <p style="margin: 5px 0;"><strong>User:</strong> ${userName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${userRole}</p>
            <p style="margin: 5px 0;"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin: 5px 0;"><strong>Requested:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/password-reset"
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Request
            </a>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Please review and process this request through the admin panel.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset success email to user
const sendPasswordResetSuccess = async ({ email, firstName, lastName, newPassword, processorName }) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'EurosHub - Password Reset Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset Approved</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName},</h2>

          <p style="color: #666; line-height: 1.6;">
            Your password reset request has been approved by ${processorName}. Your new credentials are below:
          </p>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #155724; margin: 0 0 15px 0;">Your New Credentials:</h4>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong>
              <code style="background-color: #f8f9fa; padding: 4px 8px; border-radius: 3px; font-family: monospace;">${newPassword}</code>
            </p>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Important Security Notice:</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>You must change this password immediately after logging in</li>
              <li>Do not share this password with anyone</li>
              <li>Choose a strong password that you haven't used before</li>
              <li>This temporary password will expire if not used within 30 days</li>
            </ul>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login"
               style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to Your Account
            </a>
          </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send password reset rejection email to user
const sendPasswordResetRejected = async ({ email, firstName, lastName, reason, processorName }) => {
  const transporter = await createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'EurosHub - Password Reset Request Denied',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset Request Denied</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName},</h2>

          <p style="color: #666; line-height: 1.6;">
            Your password reset request has been reviewed and denied by ${processorName}.
          </p>

          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Reason for denial:</h4>
            <p style="color: #721c24; margin: 0;">${reason}</p>
          </div>

          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">What you can do:</h4>
            <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
              <li>Contact your system administrator directly</li>
              <li>If you believe this was an error, you can submit a new request</li>
              <li>Try to remember your current password and log in normally</li>
            </ul>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login"
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Try Login Again
            </a>
          </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Automation service email methods (stubbed to prevent crashes)
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

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Email transporter not available');
    }
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('📧 Email send error:', error.message);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAccountDeactivationEmail,
  sendVerificationEmail,
  notifyAdminsPasswordResetRequest,
  sendPasswordResetSuccess,
  sendPasswordResetRejected,
  sendDueDateReminderNotification,
  sendProjectMemberAddedNotification,
  sendTaskAssignmentNotification,
  sendTaskStatusChangeNotification,
  sendTaskCommentNotification,
  sendDigestNotification,
  generateEmailTemplate,
  sendEmail
};