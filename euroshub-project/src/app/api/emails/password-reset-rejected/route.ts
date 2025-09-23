import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, reason, processorName } = await request.json();

    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName' },
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
          <h1 style="color: #dc3545; margin: 0;">Password Reset Request Denied</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName || ''},</h2>

          <p style="color: #666; line-height: 1.6;">
            We regret to inform you that your password reset request has been denied by ${processorName || 'an administrator'}.
          </p>

          ${reason ? `
          <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Reason for Denial:</h4>
            <p style="color: #721c24; margin: 0; font-size: 14px;">
              ${reason}
            </p>
          </div>
          ` : ''}

          <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #0c5460; margin: 0 0 10px 0;">What to do next:</h4>
            <p style="color: #0c5460; margin: 0; font-size: 14px;">
              If you believe this decision was made in error, please contact your administrator directly for assistance.
              You may also submit a new password reset request if your circumstances have changed.
            </p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${baseUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Try Logging In
            </a>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If you need further assistance, please contact your system administrator.
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
      subject: 'EurosHub - Password Reset Request Denied',
      html: html,
    });

    console.log(`✅ Password reset rejected email sent to ${email}`);

    return NextResponse.json({
      message: `Password reset rejected email sent successfully to ${email}`,
      success: true
    });

  } catch (error: any) {
    console.error('❌ Password reset rejected email error:', error);
    return NextResponse.json(
      { error: 'Failed to send password reset rejected email', details: error.message },
      { status: 500 }
    );
  }
}