import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

export interface SendNotificationDto {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private gateway: any; // set by gateway after init to avoid circular dep

  constructor(private prisma: PrismaService) {}

  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  // ─── Send (save + emit) ────────────────────────────────────────────────────

  async send(dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata ?? {},
      },
    });

    this.gateway?.emitToUser(dto.userId, notification);
    return notification;
  }

  // ─── Get user notifications ────────────────────────────────────────────────

  async getAll(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unread },
    };
  }

  // ─── Mark one as read ──────────────────────────────────────────────────────

  async markRead(userId: number, id: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // ─── Mark all as read ──────────────────────────────────────────────────────

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async delete(userId: number, id: number) {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { message: 'Notification deleted' };
  }
}
