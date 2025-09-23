import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email sending function using Nodemailer
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // Check if required environment variables are set
    if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
      throw new Error('Email credentials not configured. Missing EMAIL_USERNAME or EMAIL_PASSWORD');
    }

    console.log(`📧 Attempting to send email to ${to} with subject: ${subject}`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify transporter
    await transporter.verify();
    console.log('📧 Transporter verified successfully');

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to,
      subject,
      html
    });

    console.log(`📧 Email sent successfully to ${to}, messageId: ${result.messageId}`);
    return result;
  } catch (error: any) {
    console.error('📧 Email sending failed:', error);
    if (error.code === 'EAUTH') {
      throw new Error('Authentication failed. Check Gmail credentials and app password.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Network error. Unable to connect to Gmail servers.');
    }
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, userRole, requestId, eligibleAdmins } = body;

    if (!userEmail || !userName || !userRole || !requestId || !eligibleAdmins) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail, userName, userRole, requestId, eligibleAdmins' },
        { status: 400 }
      );
    }

    const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/password-requests`;
    const roleColors: { [key: string]: string } = {
      superadmin: '#6f42c1',
      admin: '#dc3545',
      hr: '#fd7e14',
      employee: '#28a745',
      client: '#17a2b8'
    };
    const roleColor = roleColors[userRole] || '#dc3545';

    const emailSubject = `Password Reset Request - ${userName} (${userRole.toUpperCase()})`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${roleColor}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔐 Password Reset Request</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0; font-size: 14px;">Role-based approval required</p>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Administrator Notification</h2>

          <p style="color: #666; line-height: 1.6;">
            A <strong>${userRole}</strong> user has requested a password reset and requires administrator approval.
          </p>

          <div style="background-color: ${roleColor}20; border-left: 4px solid ${roleColor}; padding: 20px; margin: 20px 0;">
            <h3 style="color: ${roleColor}; margin: 0 0 15px 0;">Request Details:</h3>
            <p style="margin: 5px 0; color: ${roleColor};"><strong>User:</strong> ${userName}</p>
            <p style="margin: 5px 0; color: ${roleColor};"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 5px 0; color: ${roleColor};"><strong>Role:</strong> <span style="text-transform: uppercase; font-weight: bold;">${userRole}</span></p>
            <p style="margin: 5px 0; color: ${roleColor};"><strong>Request ID:</strong> ${requestId}</p>
            <p style="margin: 5px 0; color: ${roleColor};"><strong>Requested:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">Authorization Level:</h4>
            <p style="color: #0c5460; margin: 0; font-size: 14px;">
              ${userRole === 'superadmin' ? 'Only superadmins can approve superadmin password resets.' :
                userRole === 'admin' ? 'Only superadmins can approve admin password resets.' :
                userRole === 'hr' ? 'Superadmins and admins can approve HR password resets.' :
                'Superadmins, admins, and HR can approve employee/client password resets.'}
            </p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${adminUrl}" style="background-color: ${roleColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Request
            </a>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Action Required:</h4>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              Please log in to the admin panel to approve or reject this password reset request.
            </p>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            This request will remain pending until an authorized administrator takes action.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send to all eligible admins
    const emailPromises = eligibleAdmins.map(async (admin: any) => {
      try {
        await sendEmail(admin.email, emailSubject, emailHtml);
        console.log(`📧 Password reset notification sent to ${admin.name} (${admin.role}) at ${admin.email}`);
        return { success: true, email: admin.email };
      } catch (error: any) {
        console.error(`📧 Failed to send notification to ${admin.email}:`, error.message);
        return { success: false, email: admin.email, error: error.message };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    return NextResponse.json({
      success: true,
      message: `Password reset notifications sent to ${successful.length} administrators`,
      details: {
        total: eligibleAdmins.length,
        successful: successful.length,
        failed: failed.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📧 Admin password reset email API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send admin password reset notifications',
        details: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        envCheck: {
          EMAIL_USERNAME: process.env.EMAIL_USERNAME ? 'SET' : 'NOT_SET',
          EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT_SET'
        }
      },
      { status: 500 }
    );
  }
}