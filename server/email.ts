import sgMail from '@sendgrid/mail';

const SENDGRID_CONFIGURED = !!process.env.SENDGRID_API_KEY;

if (SENDGRID_CONFIGURED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

interface PasswordResetEmailParams {
  to: string;
  userName: string;
  resetToken: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetToken,
  resetUrl
}: PasswordResetEmailParams): Promise<boolean> {
  if (!SENDGRID_CONFIGURED) {
    console.log('SendGrid not configured, password reset email simulation:');
    console.log(`To: ${to}, Reset Link: ${resetUrl}?token=${resetToken}`);
    return true;
  }
  
  try {
    const resetLink = `${resetUrl}?token=${resetToken}`;
    
    // Log the reset link for testing purposes
    console.log('=== PASSWORD RESET EMAIL ===');
    console.log(`To: ${to}`);
    console.log(`User: ${userName}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('============================');
    
    const msg = {
      to,
      from: 'noreply@projectmanager.com', // Replace with your verified sender
      subject: 'Password Reset Request',
      text: `
Hello ${userName},

You have requested to reset your password. Please click the link below to reset it:

${resetUrl}?token=${resetToken}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email.

Best regards,
Project Manager Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9fafb; }
        .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .footer { color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hello ${userName},</p>
            <p>You have requested to reset your password. Click the button below to reset it:</p>
            <a href="${resetUrl}?token=${resetToken}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${resetUrl}?token=${resetToken}
            </p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you did not request this password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Project Manager Team</p>
        </div>
    </div>
</body>
</html>
      `,
    };

    await sgMail.send(msg);
    console.log(`Password reset email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
  if (!SENDGRID_CONFIGURED) {
    console.log('SendGrid not configured, welcome email simulation:');
    console.log(`To: ${to}, User: ${userName}`);
    return true;
  }
  
  try {
    const msg = {
      to,
      from: 'noreply@projectmanager.com',
      subject: 'Welcome to Project Manager',
      text: `
Hello ${userName},

Welcome to Project Manager! Your account has been created successfully.

You can now log in and start managing your projects.

Best regards,
Project Manager Team
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9fafb; }
        .footer { color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Project Manager!</h1>
        </div>
        <div class="content">
            <p>Hello ${userName},</p>
            <p>Welcome to Project Manager! Your account has been created successfully.</p>
            <p>You can now log in and start managing your projects, collaborating with team members, and tracking your progress.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Project Manager Team</p>
        </div>
    </div>
</body>
</html>
      `,
    };

    await sgMail.send(msg);
    console.log(`Welcome email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}