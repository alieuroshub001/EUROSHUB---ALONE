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
    const { memberEmail, memberName, projectTitle, projectDescription, inviterName, role = 'member' } = body;

    if (!memberEmail || !memberName || !projectTitle || !inviterName) {
      return NextResponse.json(
        { error: 'Missing required fields: memberEmail, memberName, projectTitle, inviterName' },
        { status: 400 }
      );
    }

    const projectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/projects`;
    const emailSubject = `You've been added to ${projectTitle}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to the Team!</h1>
        </div>

        <div style="padding: 30px; background-color: white;">
          <h2 style="color: #333;">Hello ${memberName},</h2>

          <p style="color: #666; line-height: 1.6;">
            Great news! <strong>${inviterName}</strong> has added you to the project <strong>"${projectTitle}"</strong> as a <strong>${role}</strong>.
          </p>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Project Details:</h3>
            <p style="margin: 5px 0;"><strong>Project:</strong> ${projectTitle}</p>
            <p style="margin: 5px 0;"><strong>Your Role:</strong> ${role}</p>
            ${projectDescription ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${projectDescription}</p>` : ''}
          </div>

          <div style="margin: 30px 0;">
            <a href="${projectUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Project
            </a>
          </div>

          <p style="color: #666; line-height: 1.6;">
            You can now collaborate with your team, manage tasks, and track project progress. Log in to your EurosHub account to get started!
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} EurosHub. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail(memberEmail, emailSubject, emailHtml);

    return NextResponse.json({
      success: true,
      message: `Project member notification sent successfully to ${memberEmail}`
    });

  } catch (error: unknown) {
    console.error('📧 Project member email API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to send project member email',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}