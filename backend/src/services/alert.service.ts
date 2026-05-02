import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { ThreatType, ThreatSeverity, ThreatTargetType, NotificationType } from '@prisma/client';

export interface ThreatPayload {
  type: ThreatType;
  severity: ThreatSeverity;
  targetId: string;
  targetType: ThreatTargetType;
  message: string;
  meta?: Record<string, any>;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
    private email: EmailService,
  ) {}

  async raise(payload: ThreatPayload) {
    // 1. Log to SecurityThreat table
    await this.prisma.securityThreat.create({
      data: {
        type: payload.type,
        severity: payload.severity,
        targetId: payload.targetId,
        targetType: payload.targetType,
        meta: payload.meta ?? {},
      },
    });

    // 2. Find all admin users and send real-time notification
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isBlocked: false, deletedAt: null },
      select: { id: true, email: true },
    });

    const severityEmoji = {
      LOW: '🟡', MEDIUM: '🟠', HIGH: '🔴', CRITICAL: '🚨',
    }[payload.severity];

    const title = `${severityEmoji} Security Alert: ${payload.type.replace(/_/g, ' ')}`;

    for (const admin of admins) {
      // real-time bell notification
      await this.notifications.send({
        userId: admin.id,
        type: NotificationType.BOOKING_CREATED, // reusing as generic alert type
        title,
        message: payload.message,
        metadata: { threatType: payload.type, targetId: payload.targetId, ...payload.meta },
      }).catch(() => {});

      // email alert for HIGH and CRITICAL
      if ((payload.severity === 'HIGH' || payload.severity === 'CRITICAL') && admin.email) {
        await this.email.sendSecurityAlert(admin.email, title, payload.message, payload.meta ?? {})
          .catch(() => {});
      }
    }

    this.logger.warn(`[Security] ${payload.severity} — ${payload.type} — target: ${payload.targetId} — ${payload.message}`);
  }
}
