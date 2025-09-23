import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { recipientEmail, recipientName, taskTitle, projectTitle, oldStatus, newStatus, changedByName } = await request.json();

    if (!recipientEmail || !recipientName || !taskTitle || !projectTitle || !oldStatus || !newStatus || !changedByName) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientEmail, recipientName, taskTitle, projectTitle, oldStatus, newStatus, changedByName' },
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
    const taskUrl = `${baseUrl}/projects`;
    const statusColor = newStatus === 'completed' ? '#28a745' : newStatus === 'in_progress' ? '#fd7e14' : '#6c757d';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Task Status Updated</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${recipientName},</h2>

          <p style="color: #666; line-height: 1.6;">
            <strong>${changedByName}</strong> has updated the status of <strong>"${taskTitle}"</strong> in <strong>${projectTitle}</strong>.
          </p>

          <div style="background-color: ${statusColor}20; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0;">
            <h3 style="color: ${statusColor}; margin: 0 0 15px 0;">Status Change:</h3>
            <p style="margin: 5px 0;"><strong>From:</strong> <span style="text-transform: capitalize;">${oldStatus.replace('_', ' ')}</span></p>
            <p style="margin: 5px 0;"><strong>To:</strong> <span style="text-transform: capitalize; color: ${statusColor}; font-weight: bold;">${newStatus.replace('_', ' ')}</span></p>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
            <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
            <p style="margin: 5px 0;"><strong>Updated by:</strong> ${changedByName}</p>
          </div>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${taskUrl}" style="background-color: ${statusColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Project
            </a>
          </div>

          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Stay updated with your project progress and collaborate effectively with your team.
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
      subject: `Task Status Updated: ${taskTitle}`,
      html: html,
    });

    console.log(`✅ Task status change email sent to ${recipientEmail}`);

    return NextResponse.json({
      message: `Task status change notification sent successfully to ${recipientEmail}`,
      success: true
    });

  } catch (error: any) {
    console.error('❌ Task status change email error:', error);
    return NextResponse.json(
      { error: 'Failed to send task status change notification', details: error.message },
      { status: 500 }
    );
  }
}