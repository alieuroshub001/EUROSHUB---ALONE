import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email sending function using Nodemailer
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
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
  } catch (error: unknown) {
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, resetToken } = body;

    if (!email || !firstName || !resetToken) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, resetToken' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: `Password reset email sent successfully to ${email}`
    });

  } catch (error: unknown) {
    console.error('📧 Password reset email API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to send password reset email',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}