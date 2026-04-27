import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminActionType, AdminTargetType, VendorStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Dashboard Stats ───────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalUsers, totalVendors, totalBookings, totalRevenue,
      pendingVendors, activeBookings, recentBookings, vendorsByCategory,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.vendor.count({ where: { deletedAt: null } }),
      this.prisma.booking.count({ where: { deletedAt: null } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      this.prisma.vendor.count({ where: { status: VendorStatus.PENDING, deletedAt: null } }),
      this.prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] }, deletedAt: null } }),
      this.prisma.booking.findMany({
        where: { deletedAt: null },
        take: 7,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, status: true, createdAt: true,
          customer: { select: { name: true } },
          vendor: { select: { businessName: true } },
          service: { select: { name: true, price: true } },
        },
      }),
      this.prisma.vendor.groupBy({
        by: ['categoryId'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
    ]);

    // category names
    const categories = await this.prisma.category.findMany({
      where: { id: { in: vendorsByCategory.map(v => v.categoryId) } },
      select: { id: true, name: true },
    });
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    return {
      totalUsers,
      totalVendors,
      totalBookings,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      pendingVendors,
      activeBookings,
      recentBookings,
      vendorsByCategory: vendorsByCategory.map(v => ({
        name: categoryMap[v.categoryId] ?? 'Unknown',
        count: v._count.id,
      })),
    };
  }

  // ─── List Users ────────────────────────────────────────────────────────────

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, isEmailVerified: true, isBlocked: true,
          createdAt: true,
          _count: { select: { bookings: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Block / Unblock User ──────────────────────────────────────────────────

  async blockUser(adminId: number, userId: number) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

    await this.prisma.adminAction.create({
      data: { adminId, targetId: userId, targetType: AdminTargetType.USER, action: AdminActionType.BLOCK_USER },
    });

    return updated;
  }

  async unblockUser(adminId: number, userId: number) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });

    await this.prisma.adminAction.create({
      data: { adminId, targetId: userId, targetType: AdminTargetType.USER, action: AdminActionType.UNBLOCK_USER },
    });

    return updated;
  }

  // ─── Audit Log ─────────────────────────────────────────────────────────────

  async getAuditLog(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [actions, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAction.count(),
    ]);

    return { data: actions, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
