import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { recipientEmail, recipientName, commenterName, taskTitle, projectTitle, commentText, taskId } = await request.json();

    if (!recipientEmail || !recipientName || !commenterName || !taskTitle || !projectTitle || !commentText) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, recipientName, commenterName, taskTitle, projectTitle, commentText' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.CLIENT_URL || 'https://euroshub-alone.vercel.app';
    const taskUrl = taskId ? `${baseUrl}/projects` : `${baseUrl}/projects`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #17a2b8; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Comment</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${recipientName},</h2>

          <p style="color: #666; line-height: 1.6;">
            <strong>${commenterName}</strong> left a comment on the task <strong>"${taskTitle}"</strong> in <strong>${projectTitle}</strong>.
          </p>

          <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin: 0 0 15px 0;">Comment:</h3>
            <p style="margin: 0; color: #0c5460; font-style: italic;">"${commentText}"</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
            <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
            <p style="margin: 5px 0;"><strong>Commented by:</strong> ${commenterName}</p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${taskUrl}" style="background-color: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Task & Reply
            </a>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Join the conversation and keep your projects moving forward.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: recipientEmail,
      subject: `New comment on: ${taskTitle}`,
      html: html,
    });

    console.log(`✅ Task comment notification sent to ${recipientEmail}`);

    return NextResponse.json({
      message: `Task comment notification sent successfully to ${recipientEmail}`,
      success: true
    });

  } catch (error: any) {
    console.error('❌ Task comment notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send task comment notification', details: error.message },
      { status: 500 }
    );
  }
}