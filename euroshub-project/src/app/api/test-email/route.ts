import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    // Check environment variables
    const emailConfig = {
      EMAIL_USERNAME: process.env.EMAIL_USERNAME,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT_SET'
    };

    console.log('📧 Email configuration:', emailConfig);

    return NextResponse.json({
      success: true,
      message: 'Email configuration check',
      config: emailConfig,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📧 Email config check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check email configuration',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Testing email sending...');

    // Check if required environment variables are set
    if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
      return NextResponse.json(
        {
          error: 'Email credentials not configured',
          config: {
            EMAIL_USERNAME: process.env.EMAIL_USERNAME ? 'SET' : 'NOT_SET',
            EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT_SET'
          }
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { testEmail = 'ali.rayyan001@gmail.com' } = body;

    console.log(`📧 Sending test email to ${testEmail}...`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify transporter configuration
    await transporter.verify();
    console.log('📧 Transporter verified successfully');

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: testEmail,
      subject: 'Test Email from Vercel - EurosHub',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007bff;">🎉 Email Test Successful!</h1>
          <p>This test email was sent from your Vercel deployment at ${new Date().toISOString()}</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Service: Gmail</li>
            <li>From: ${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}</li>
            <li>Environment: Vercel</li>
          </ul>
          <p>Your email service is working correctly! 🚀</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📧 Test email error:', error);

    // Provide specific error details
    let errorDetails = error.message;
    if (error.code === 'EAUTH') {
      errorDetails = 'Authentication failed. Check your Gmail credentials and ensure 2FA app password is correct.';
    } else if (error.code === 'ENOTFOUND') {
      errorDetails = 'Network error. Check your internet connection.';
    }

    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: errorDetails,
        code: error.code,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}