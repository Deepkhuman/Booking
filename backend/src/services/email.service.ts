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
      from: `"Plugin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your email — Plugin',
      html: this.wrap(`
        <h2>Verify your email</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${verifyUrl}" class="btn">Verify Email</a>
        <p class="muted">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      `),
    });
    this.logger.log(`Verification email sent to ${email}: ${nodemailer.getTestMessageUrl(info)}`);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/reset-password?token=${token}`;

    const info = await this.transporter.sendMail({
      from: `"Plugin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset your password — Plugin',
      html: this.wrap(`
        <h2>Reset your password</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" class="btn">Reset Password</a>
        <p class="muted">If you didn't request this, ignore this email.</p>
      `),
    });
    this.logger.log(`Password reset email sent to ${email}: ${nodemailer.getTestMessageUrl(info)}`);
  }

  // ─── Phase 2 Bot Emails ────────────────────────────────────────────────────

  async sendBookingReminderCustomer(email: string, name: string, businessName: string, serviceName: string, date: string, time: string) {
    await this.send(email, `Reminder: Your booking tomorrow at ${businessName}`, this.wrap(`
      <h2>Booking Reminder 📅</h2>
      <p>Hi ${name},</p>
      <p>Just a reminder that you have a booking tomorrow:</p>
      <div class="card">
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${date}</p>
        ${time ? `<p><strong>Time:</strong> ${time}</p>` : ''}
      </div>
      <p class="muted">Please arrive on time. If you need to cancel, do so from your bookings page.</p>
    `));
  }

  async sendBookingReminderVendor(email: string, name: string, customerName: string, serviceName: string, date: string, time: string) {
    await this.send(email, `Reminder: Booking tomorrow — ${customerName}`, this.wrap(`
      <h2>Upcoming Booking Tomorrow 📅</h2>
      <p>Hi ${name},</p>
      <p>You have a booking scheduled for tomorrow:</p>
      <div class="card">
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${date}</p>
        ${time ? `<p><strong>Time:</strong> ${time}</p>` : ''}
      </div>
      <p class="muted">Make sure you're prepared. Manage bookings from your vendor dashboard.</p>
    `));
  }

  async sendWeeklyAdminReport(email: string, stats: {
    totalBookings: number; newBookings: number; revenue: number;
    newVendors: number; newUsers: number; pendingApprovals: number;
  }) {
    await this.send(email, '📊 Weekly Platform Report — Plugin', this.wrap(`
      <h2>Weekly Report</h2>
      <p>Here's your platform summary for this week:</p>
      <div class="card">
        <p><strong>New Bookings:</strong> ${stats.newBookings}</p>
        <p><strong>Total Bookings:</strong> ${stats.totalBookings}</p>
        <p><strong>Revenue This Week:</strong> ₹${stats.revenue.toLocaleString()}</p>
        <p><strong>New Vendors:</strong> ${stats.newVendors}</p>
        <p><strong>New Users:</strong> ${stats.newUsers}</p>
        <p><strong>Pending Approvals:</strong> ${stats.pendingApprovals}</p>
      </div>
    `));
  }

  async sendVendorInactivityNudge(email: string, name: string, businessName: string) {
    await this.send(email, `We miss you, ${name} 👋`, this.wrap(`
      <h2>It's been a while!</h2>
      <p>Hi ${name},</p>
      <p>We noticed you haven't logged into your <strong>${businessName}</strong> dashboard in a while.</p>
      <p>Your customers might be looking for you. Log in to check your bookings and keep your profile up to date.</p>
      <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/vendor-dashboard" class="btn">Go to Dashboard</a>
    `));
  }

  async sendSponsorExpiryWarning(email: string, name: string, businessName: string, expiresOn: string) {
    await this.send(email, `Your sponsorship expires in 3 days — ${businessName}`, this.wrap(`
      <h2>Sponsorship Expiring Soon ⚠️</h2>
      <p>Hi ${name},</p>
      <p>Your sponsored listing for <strong>${businessName}</strong> expires on <strong>${expiresOn}</strong>.</p>
      <p>Sponsored vendors appear at the top of search results and get significantly more bookings.</p>
      <p>Contact us to renew your sponsorship before it expires.</p>
    `));
  }

  async sendReviewNudge(email: string, name: string, businessName: string, serviceName: string) {
    await this.send(email, `How was your experience at ${businessName}?`, this.wrap(`
      <h2>How was your visit? ⭐</h2>
      <p>Hi ${name},</p>
      <p>You recently visited <strong>${businessName}</strong> for <strong>${serviceName}</strong>.</p>
      <p>Your review helps other customers and supports local businesses. It only takes 30 seconds!</p>
      <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/customer-dashboard/bookings" class="btn">Leave a Review</a>
    `));
  }

  async sendReEngagementEmail(email: string, name: string, categories: string[]) {
    const catList = categories.map(c => `<span style="display:inline-block;background:#f3ede6;padding:4px 12px;border-radius:100px;margin:4px;font-size:13px">${c}</span>`).join('');
    await this.send(email, 'Vendors near you are waiting 👋', this.wrap(`
      <h2>It's been a while, ${name}!</h2>
      <p>You haven't made a booking in a while. Here's what's available near you:</p>
      <div style="margin: 16px 0">${catList}</div>
      <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/customer-dashboard/explore" class="btn">Explore Vendors</a>
    `));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string) {
    const info = await this.transporter.sendMail({
      from: `"Plugin" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent to ${to} — ${nodemailer.getTestMessageUrl(info) || ''}`);
  }

  private wrap(content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Inter, Arial, sans-serif; background: #faf7f4; margin: 0; padding: 0; color: #2c1810; }
        .container { max-width: 560px; margin: 40px auto; background: #fffcfa; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(107,39,55,0.1); }
        .header { background: linear-gradient(135deg, #6b2737, #8b3a4a); padding: 28px 32px; }
        .header h1 { color: white; margin: 0; font-size: 22px; letter-spacing: -0.5px; }
        .body { padding: 32px; }
        h2 { font-size: 20px; margin: 0 0 12px; color: #2c1810; }
        p { font-size: 15px; line-height: 1.6; color: #6b4c4c; margin: 8px 0; }
        .btn { display: inline-block; margin: 20px 0; padding: 12px 28px; background: linear-gradient(135deg, #6b2737, #8b3a4a); color: white !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; }
        .card { background: #f3ede6; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
        .card p { margin: 6px 0; font-size: 14px; }
        .muted { font-size: 13px; color: #a08080; margin-top: 16px; }
        .footer { padding: 20px 32px; border-top: 1px solid rgba(139,69,69,0.1); font-size: 12px; color: #a08080; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Plugin</h1></div>
        <div class="body">${content}</div>
        <div class="footer">Plugin — Free vendor marketplace &nbsp;|&nbsp; You're receiving this because you have an account on Plugin.</div>
      </div>
    </body>
    </html>`;
  }
}