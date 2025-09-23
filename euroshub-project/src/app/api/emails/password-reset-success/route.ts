import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, newPassword, processorName } = await request.json();

    if (!email || !firstName || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, newPassword' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://euroshub-alone.vercel.app';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Password Reset Approved</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName || ''},</h2>

          <p style="color: #666; line-height: 1.6;">
            Your password reset request has been approved by ${processorName || 'an administrator'}.
            Here are your new login credentials:
          </p>

          <div style="background-color: #e7f3ff; border: 1px solid #bee5eb; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">Your New Credentials:</h4>
            <p style="color: #0c5460; margin: 0; font-size: 16px;">
              <strong>Email:</strong> ${email}<br>
              <strong>Temporary Password:</strong> <code style="background-color: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${newPassword}</code>
            </p>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Important Security Notice:</h4>
            <p style="color: #856404; margin: 0; font-size: 14px;">
              Please log in with your new password and change it immediately for security purposes.
              This temporary password should not be shared with anyone.
            </p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${baseUrl}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Login to Your Account
            </a>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If you have any issues logging in, please contact your administrator for assistance.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: email,
      subject: 'EurosHub - Password Reset Approved',
      html: html,
    });

    console.log(`✅ Password reset success email sent to ${email}`);

    return NextResponse.json({
      message: `Password reset success email sent successfully to ${email}`,
      success: true
    });

  } catch (error: any) {
    console.error('❌ Password reset success email error:', error);
    return NextResponse.json(
      { error: 'Failed to send password reset success email', details: error.message },
      { status: 500 }
    );
  }
}