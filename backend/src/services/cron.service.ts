import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { BookingStatus, NotificationType } from '@prisma/client';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
    private email: EmailService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 1 — Auto-Complete Bookings
  // Every 30 mins — CONFIRMED bookings past their date+time → COMPLETED
  // ─────────────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async autoCompleteBookings() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // SLOT_BASED / HOURLY — past date, or same date but past time
    const slotBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        deletedAt: null,
        bookingType: { in: ['SLOT_BASED', 'HOURLY'] },
        OR: [
          { date: { lt: today } },
          { date: today, startTime: { lt: currentTime } },
        ],
      },
      select: { id: true, customerId: true },
    });

    // DAILY — checkOut is in the past
    const dailyBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        deletedAt: null,
        bookingType: 'DAILY',
        checkOut: { lt: now },
      },
      select: { id: true, customerId: true },
    });

    const all = [...slotBookings, ...dailyBookings];
    if (!all.length) return;

    await this.prisma.booking.updateMany({
      where: { id: { in: all.map(b => b.id) } },
      data: { status: BookingStatus.COMPLETED },
    });

    // notify each customer
    for (const b of all) {
      await this.notifications.send({
        userId: b.customerId,
        type: NotificationType.BOOKING_COMPLETED,
        title: 'Booking Completed',
        message: 'Your booking is complete. How was your experience? Leave a review!',
        metadata: { bookingId: b.id },
      });
    }

    this.logger.log(`[Bot 1] Auto-completed ${all.length} bookings`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 2 — Auto No-Show
  // Every 30 mins — PENDING bookings 2hrs past scheduled time → NO_SHOW
  // ─────────────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async autoNoShow() {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const cutoffDate = twoHoursAgo.toISOString().split('T')[0];
    const cutoffTime = `${twoHoursAgo.getHours().toString().padStart(2, '0')}:${twoHoursAgo.getMinutes().toString().padStart(2, '0')}`;

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        deletedAt: null,
        bookingType: { in: ['SLOT_BASED', 'HOURLY'] },
        OR: [
          { date: { lt: cutoffDate } },
          { date: cutoffDate, startTime: { lte: cutoffTime } },
        ],
      },
      select: { id: true, customerId: true, vendorId: true },
      take: 100,
    });

    if (!bookings.length) return;

    await this.prisma.booking.updateMany({
      where: { id: { in: bookings.map(b => b.id) } },
      data: { status: BookingStatus.NO_SHOW },
    });

    this.logger.log(`[Bot 2] Marked ${bookings.length} bookings as NO_SHOW`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 3 — Auto-Cancel Stale Bookings
  // Daily 1am — PENDING bookings older than 48hrs → CANCELLED + notify customer
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 1 * * *')
  async autoCancelStaleBookings() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        deletedAt: null,
        createdAt: { lt: cutoff },
      },
      select: { id: true, customerId: true },
      take: 200,
    });

    if (!bookings.length) return;

    await this.prisma.booking.updateMany({
      where: { id: { in: bookings.map(b => b.id) } },
      data: { status: BookingStatus.CANCELLED },
    });

    for (const b of bookings) {
      await this.notifications.send({
        userId: b.customerId,
        type: NotificationType.BOOKING_CANCELLED,
        title: 'Booking Cancelled',
        message: 'Your booking was automatically cancelled as the vendor did not respond within 48 hours.',
        metadata: { bookingId: b.id },
      });
    }

    this.logger.log(`[Bot 3] Auto-cancelled ${bookings.length} stale bookings`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 4 — Expire Sponsorships
  // Every hour — sponsoredUntil < now → remove sponsorship
  // ─────────────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async expireSponsorships() {
    const result = await this.prisma.vendor.updateMany({
      where: {
        isSponsored: true,
        sponsoredUntil: { lt: new Date() },
      },
      data: {
        isSponsored: false,
        sponsoredUntil: null,
        sponsorTier: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`[Bot 4] Expired ${result.count} sponsorships`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 5 — Cleanup Expired Tokens
  // Daily 2am — delete expired refresh tokens, reset tokens, verify tokens
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 2 * * *')
  async cleanupExpiredTokens() {
    const now = new Date();

    // expired refresh tokens
    const { count: refreshCount } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // expired password reset tokens
    const { count: resetCount } = await this.prisma.user.updateMany({
      where: {
        passwordResetExpiry: { lt: now },
        passwordResetToken: { not: null },
      },
      data: { passwordResetToken: null, passwordResetExpiry: null },
    });

    // stale email verify tokens (older than 24hrs, still unverified)
    const verifyExpiry = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { count: verifyCount } = await this.prisma.user.updateMany({
      where: {
        isEmailVerified: false,
        emailVerifyToken: { not: null },
        createdAt: { lt: verifyExpiry },
      },
      data: { emailVerifyToken: null },
    });

    this.logger.log(`[Bot 5] Cleaned up tokens — refresh: ${refreshCount}, reset: ${resetCount}, verify: ${verifyCount}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 6 — Stale Notification Cleanup
  // Weekly Sunday 3am — delete read notifications older than 60 days
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 3 * * 0')
  async cleanupStaleNotifications() {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoff },
      },
    });

    this.logger.log(`[Bot 6] Deleted ${count} stale notifications`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 7 — Orphan Record Cleanup
  // Daily 3am — hard delete soft-deleted records older than 30 days
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 3 * * *')
  async cleanupOrphanRecords() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [vendors, services, bookings] = await Promise.all([
      this.prisma.vendor.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.prisma.vendorService.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.prisma.booking.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    ]);

    this.logger.log(`[Bot 7] Orphan cleanup — vendors: ${vendors.count}, services: ${services.count}, bookings: ${bookings.count}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 8 — Zero-Service Vendor Flag
  // Daily 5am — approved vendors with 0 active services → set isActive=false
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 5 * * *')
  async flagZeroServiceVendors() {
    // find approved vendors with no active+enabled services
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        _count: {
          select: {
            services: {
              where: { isActive: true, isEnabled: true, deletedAt: null },
            },
          },
        },
      },
    });

    const zeroServiceIds = vendors
      .filter(v => v._count.services === 0)
      .map(v => v.id);

    if (!zeroServiceIds.length) return;

    await this.prisma.vendor.updateMany({
      where: { id: { in: zeroServiceIds } },
      data: { isActive: false },
    });

    this.logger.log(`[Bot 8] Flagged ${zeroServiceIds.length} vendors with 0 active services`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 9 & 10 — Booking Reminders (Customer + Vendor)
  // Daily 8am — bookings scheduled for tomorrow → email both parties
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 8 * * *')
  async sendBookingReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const bookings = await this.prisma.booking.findMany({
      where: {
        date: tomorrowStr,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        deletedAt: null,
      },
      include: {
        customer: { select: { name: true, email: true } },
        vendor: { select: { businessName: true, user: { select: { name: true, email: true } } } },
        service: { select: { name: true } },
      },
    });

    for (const b of bookings) {
      const date = b.date!;
      const time = b.startTime ?? '';

      if (b.customer.email) {
        await this.email.sendBookingReminderCustomer(
          b.customer.email, b.customer.name ?? 'there',
          b.vendor.businessName, b.service.name, date, time,
        ).catch(() => {});
      }

      if ((b.vendor as any).user?.email) {
        await this.email.sendBookingReminderVendor(
          (b.vendor as any).user.email, (b.vendor as any).user.name ?? 'there',
          b.customer.name ?? 'A customer', b.service.name, date, time,
        ).catch(() => {});
      }
    }

    this.logger.log(`[Bot 9/10] Sent booking reminders for ${bookings.length} bookings`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 11 — Weekly Admin Report
  // Every Monday 7am — stats email to admin
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 7 * * 1')
  async sendWeeklyAdminReport() {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalBookings, newBookings, revenueResult, newVendors, newUsers, pendingApprovals] =
      await Promise.all([
        this.prisma.booking.count({ where: { deletedAt: null } }),
        this.prisma.booking.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
        this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS', createdAt: { gte: weekAgo } } }),
        this.prisma.vendor.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
        this.prisma.user.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
        this.prisma.vendor.count({ where: { status: 'PENDING', deletedAt: null } }),
      ]);

    await this.email.sendWeeklyAdminReport(adminEmail, {
      totalBookings, newBookings,
      revenue: revenueResult._sum.amount ?? 0,
      newVendors, newUsers, pendingApprovals,
    }).catch(() => {});

    this.logger.log('[Bot 11] Weekly admin report sent');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 12 — Vendor Inactivity Nudge
  // Every Monday 9am — vendors not logged in 14 days → reminder email
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 9 * * 1')
  async sendVendorInactivityNudge() {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        user: { updatedAt: { lt: cutoff }, isBlocked: false },
      },
      select: { businessName: true, user: { select: { name: true, email: true } } },
      take: 100,
    });

    for (const v of vendors) {
      if (!v.user?.email) continue;
      await this.email.sendVendorInactivityNudge(
        v.user.email, v.user.name ?? 'there', v.businessName,
      ).catch(() => {});
    }

    this.logger.log(`[Bot 12] Sent inactivity nudge to ${vendors.length} vendors`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 13 — Sponsored Expiry Warning
  // Daily 9am — sponsorship expiring in 3 days → email vendor
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 9 * * *')
  async sendSponsorExpiryWarnings() {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const vendors = await this.prisma.vendor.findMany({
      where: {
        isSponsored: true,
        sponsoredUntil: { gte: tomorrow, lte: in3Days },
        deletedAt: null,
      },
      select: { businessName: true, sponsoredUntil: true, user: { select: { name: true, email: true } } },
    });

    for (const v of vendors) {
      if (!v.user?.email || !v.sponsoredUntil) continue;
      await this.email.sendSponsorExpiryWarning(
        v.user.email, v.user.name ?? 'there',
        v.businessName, v.sponsoredUntil.toLocaleDateString('en-IN'),
      ).catch(() => {});
    }

    this.logger.log(`[Bot 13] Sent sponsor expiry warnings to ${vendors.length} vendors`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 14 — Review Nudge
  // Daily 10am — completed bookings 24-48hrs ago with no review → email customer
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 10 * * *')
  async sendReviewNudges() {
    const from = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const to = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.COMPLETED,
        deletedAt: null,
        updatedAt: { gte: from, lte: to },
        review: null,
      },
      include: {
        customer: { select: { name: true, email: true } },
        vendor: { select: { businessName: true } },
        service: { select: { name: true } },
      },
      take: 200,
    });

    for (const b of bookings) {
      if (!b.customer.email) continue;
      await this.email.sendReviewNudge(
        b.customer.email, b.customer.name ?? 'there',
        b.vendor.businessName, b.service.name,
      ).catch(() => {});
    }

    this.logger.log(`[Bot 14] Sent review nudges for ${bookings.length} bookings`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 15 — Re-engagement Bot
  // Every Sunday 10am — customers with no booking in 30 days → email
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 10 * * 0')
  async sendReEngagementEmails() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const customers = await this.prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        isBlocked: false,
        deletedAt: null,
        bookings: { none: { createdAt: { gte: cutoff }, deletedAt: null } },
      },
      select: { name: true, email: true },
      take: 500,
    });

    const categories = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      select: { name: true },
      take: 6,
    });

    for (const u of customers) {
      if (!u.email) continue;
      await this.email.sendReEngagementEmail(
        u.email, u.name ?? 'there', categories.map(c => c.name),
      ).catch(() => {});
    }

    this.logger.log(`[Bot 15] Sent re-engagement emails to ${customers.length} customers`);
  }
}
