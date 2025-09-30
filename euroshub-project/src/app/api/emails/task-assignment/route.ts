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
    const { assigneeEmail, assigneeName, taskTitle, taskDescription, projectTitle, assignerName, dueDate = null } = body;

    if (!assigneeEmail || !assigneeName || !taskTitle || !projectTitle || !assignerName) {
      return NextResponse.json(
        { error: 'Missing required fields: assigneeEmail, assigneeName, taskTitle, projectTitle, assignerName' },
        { status: 400 }
      );
    }

    const taskUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/projects`;
    const dueDateText = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date set';
    const emailSubject = `New Task Assigned: ${taskTitle}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Task Assigned</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${assigneeName},</h2>

          <p style="color: #666; line-height: 1.6;">
            <strong>${assignerName}</strong> has assigned you a new task in <strong>${projectTitle}</strong>.
          </p>

          <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0 0 15px 0;">Task Details:</h3>
            <p style="margin: 5px 0; color: #155724;"><strong>Task:</strong> ${taskTitle}</p>
            <p style="margin: 5px 0; color: #155724;"><strong>Project:</strong> ${projectTitle}</p>
            <p style="margin: 5px 0; color: #155724;"><strong>Due Date:</strong> ${dueDateText}</p>
            ${taskDescription ? `<p style="margin: 5px 0; color: #155724;"><strong>Description:</strong> ${taskDescription}</p>` : ''}
          </div>

          <div style="margin: 30px 0;">
            <a href="${taskUrl}" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Task
            </a>
          </div>

          <p style="color: #666; line-height: 1.6;">
            Please review the task details and update its progress as you work on it. Your team is counting on you!
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail(assigneeEmail, emailSubject, emailHtml);

    return NextResponse.json({
      success: true,
      message: `Task assignment notification sent successfully to ${assigneeEmail}`
    });

  } catch (error: unknown) {
    console.error('📧 Task assignment email API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to send task assignment email',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}