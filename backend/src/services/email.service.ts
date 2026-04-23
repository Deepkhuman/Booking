import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    const port = Number(process.env.SMTP_PORT) || 587;
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.ethereal.email',
      port,
      secure: port === 465,   // true for 465 (SSL), false for 587 (STARTTLS)
      requireTLS: port !== 465, // force STARTTLS upgrade on 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;

    const info = await this.transporter.sendMail({
      from: `"Booking Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your email',
      html: `<p>Click the link below to verify your email:</p>
             <a href="${verifyUrl}">${verifyUrl}</a>
             <p>This link expires in 24 hours.</p>`,
    });

    this.logger.log(`Verification email sent to ${email}: ${nodemailer.getTestMessageUrl(info)}`);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/api/auth/reset-password?token=${token}`;

    const info = await this.transporter.sendMail({
      from: `"Booking Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset your password',
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>This link expires in 1 hour.</p>
             <p>If you did not request this, ignore this email.</p>`,
    });

    this.logger.log(`Password reset email sent to ${email}: ${nodemailer.getTestMessageUrl(info)}`);
  }
}
