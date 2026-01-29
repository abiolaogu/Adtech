import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      SMTP_FROM_NAME,
      NODE_ENV,
    } = process.env;

    // Email is optional - don't throw errors if not configured
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      logger.warn('Email service not configured. Email features will be disabled.');
      this.enabled = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      this.enabled = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', { error });
      this.enabled = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      logger.warn('Email service not enabled. Cannot send email.', { to: options.to });
      return false;
    }

    try {
      const { SMTP_FROM = 'noreply@adtech.local', SMTP_FROM_NAME = 'AdTech Platform' } = process.env;

      await this.transporter.sendMail({
        from: `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      });

      logger.info('Email sent successfully', { to: options.to, subject: options.subject });
      return true;
    } catch (error) {
      logger.error('Failed to send email', { to: options.to, error });
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, name: string): Promise<boolean> {
    const { APP_URL = 'http://localhost:3000' } = process.env;
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to AdTech Platform!</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>Thank you for registering with AdTech Platform. Please verify your email address to complete your registration.</p>
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} AdTech Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name: string): Promise<boolean> {
    const { APP_URL = 'http://localhost:3000' } = process.env;
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>We received a request to reset your password for your AdTech Platform account.</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
      <div class="warning">
        <strong>Important:</strong> This link will expire in 1 hour for security reasons.
      </div>
      <p><strong>If you didn't request a password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} AdTech Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html,
    });
  }

  async send2FASetupEmail(email: string, name: string): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Two-Factor Authentication Enabled</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <div class="success">
        <strong>Success!</strong> Two-factor authentication has been enabled on your account.
      </div>
      <p>Your account is now more secure. You'll need your authenticator app to log in from now on.</p>
      <p><strong>Important:</strong> Make sure you've saved your backup codes in a safe place. You'll need them if you lose access to your authenticator app.</p>
      <p>If you didn't enable 2FA, please contact support immediately.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} AdTech Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: email,
      subject: 'Two-Factor Authentication Enabled',
      html,
    });
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const emailService = new EmailService();
