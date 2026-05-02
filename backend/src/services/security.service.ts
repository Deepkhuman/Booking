import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from './alert.service';
import { createClient } from 'redis';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private redis: ReturnType<typeof createClient> | null = null;

  constructor(
    private prisma: PrismaService,
    private alert: AlertService,
  ) {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redis = createClient({
        socket: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });
      await this.redis.connect();
    } catch {
      this.logger.warn('Redis unavailable — security rate tracking disabled');
      this.redis = null;
    }
  }

  private async incr(key: string, ttlSeconds: number): Promise<number> {
    if (!this.redis) return 0;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, ttlSeconds);
    return count;
  }

  private async get(key: string): Promise<number> {
    if (!this.redis) return 0;
    const val = await this.redis.get(key);
    return val ? Number(val) : 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 16 — Brute Force Detector
  // On failed login — 5 fails in 10 mins from same IP → alert admin
  // (account lockout already handled in AuthService, this alerts admin)
  // ─────────────────────────────────────────────────────────────────────────

  async onFailedLogin(ip: string, email: string) {
    const count = await this.incr(`brute:${ip}`, 600); // 10 min window
    if (count === 5) {
      await this.alert.raise({
        type: 'BRUTE_FORCE',
        severity: 'HIGH',
        targetId: ip,
        targetType: 'IP',
        message: `5 failed login attempts in 10 minutes from IP ${ip} targeting ${email}`,
        meta: { ip, email, attempts: count },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 17 — Token Abuse Detector
  // On refresh token use — same token from 2 different IPs → revoke + alert
  // ─────────────────────────────────────────────────────────────────────────

  async onRefreshTokenUse(token: string, ip: string, userId: number) {
    if (!this.redis) return;
    const key = `token_ip:${token}`;
    const storedIp = await this.redis.get(key);

    if (!storedIp) {
      await this.redis.setEx(key, 7 * 24 * 3600, ip); // store for 7 days
      return;
    }

    if (storedIp !== ip) {
      // revoke ALL tokens for this user
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
      await this.redis.del(key);

      await this.alert.raise({
        type: 'TOKEN_ABUSE',
        severity: 'CRITICAL',
        targetId: String(userId),
        targetType: 'USER',
        message: `Refresh token used from 2 different IPs. All tokens revoked for user #${userId}`,
        meta: { userId, originalIp: storedIp, newIp: ip },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 18 — Mass Booking Detector
  // On booking create — 5+ bookings in 10 mins by same user → block + alert
  // ─────────────────────────────────────────────────────────────────────────

  async onBookingCreated(userId: number) {
    const count = await this.incr(`mass_booking:${userId}`, 600);
    if (count === 5) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isBlocked: true },
      });

      await this.alert.raise({
        type: 'MASS_BOOKING',
        severity: 'HIGH',
        targetId: String(userId),
        targetType: 'USER',
        message: `User #${userId} created 5+ bookings in 10 minutes. Account auto-blocked.`,
        meta: { userId, count },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 19 — Suspicious Payment Detector
  // On payment verify — 3+ payments in 5 mins by same user → flag + alert
  // ─────────────────────────────────────────────────────────────────────────

  async onPaymentVerified(userId: number) {
    const count = await this.incr(`sus_payment:${userId}`, 300); // 5 min window
    if (count === 3) {
      await this.alert.raise({
        type: 'SUSPICIOUS_PAYMENT',
        severity: 'HIGH',
        targetId: String(userId),
        targetType: 'USER',
        message: `User #${userId} made 3+ payments in 5 minutes. Possible fraud.`,
        meta: { userId, count },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 20 — Rating Bomb Detector
  // On review create — vendor gets 3+ reviews ≤ 2 stars in 1hr → hide + alert
  // ─────────────────────────────────────────────────────────────────────────

  async onReviewCreated(vendorId: number, rating: number) {
    if (rating > 2) return;
    const count = await this.incr(`rating_bomb:${vendorId}`, 3600); // 1hr window
    if (count === 3) {
      // hide all low reviews from last hour
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      await this.prisma.review.updateMany({
        where: {
          vendorId,
          rating: { lte: 2 },
          createdAt: { gte: oneHourAgo },
          isVisible: true,
        },
        data: { isVisible: false },
      });

      await this.alert.raise({
        type: 'RATING_BOMB',
        severity: 'HIGH',
        targetId: String(vendorId),
        targetType: 'VENDOR',
        message: `Vendor #${vendorId} received 3+ reviews ≤ 2 stars in 1 hour. Reviews auto-hidden.`,
        meta: { vendorId, count },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOT 21 — Fake Vendor Detector
  // On vendor register — same IP registers 2+ vendors → flag + alert
  // ─────────────────────────────────────────────────────────────────────────

  async onVendorRegistered(vendorId: number, ip: string) {
    const count = await this.incr(`fake_vendor:${ip}`, 24 * 3600); // 24hr window
    if (count === 2) {
      await this.alert.raise({
        type: 'FAKE_VENDOR',
        severity: 'MEDIUM',
        targetId: ip,
        targetType: 'IP',
        message: `2 vendor registrations from same IP ${ip} within 24 hours. Possible fake vendor.`,
        meta: { ip, vendorId, count },
      });
    }
  }
}
