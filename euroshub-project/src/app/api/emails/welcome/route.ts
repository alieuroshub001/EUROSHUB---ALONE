import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email sending function using Nodemailer with enhanced error handling
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
  } catch (error: unknown) {
    console.error('📧 Email sending failed:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EAUTH') {
      throw new Error('Authentication failed. Check Gmail credentials and app password.');
    } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOTFOUND') {
      throw new Error('Network error. Unable to connect to Gmail servers.');
    }
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, tempPassword, role, verificationToken } = body;

    if (!email || !firstName || !lastName || !tempPassword || !role || !verificationToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: `Welcome email sent successfully to ${email}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('📧 Welcome email API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error && typeof error === 'object' && 'code' in error ? (error.code as string) : undefined;
    return NextResponse.json(
      {
        error: 'Failed to send welcome email',
        details: errorMessage,
        code: errorCode,
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