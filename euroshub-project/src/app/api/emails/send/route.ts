import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email sending function using Nodemailer
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    console.log(`📧 Sending email to ${to}...`);

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

    console.log(`📧 Email sent successfully: ${subject} to ${to}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`📧 Email sending failed for ${to}:`, errorMessage);

    // Log helpful debugging info
    if (!process.env.EMAIL_USERNAME) {
      console.error('📧 No email service configured. Add EMAIL_USERNAME/EMAIL_PASSWORD');
    }

    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, type } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Send the email
    await sendEmail(to, subject, html);

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${to}`,
      type: type || 'general'
    });

  } catch (error: unknown) {
    console.error('📧 Email API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}