import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../services/admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AdminActionType, AdminTargetType } from '@prisma/client';

const mockPrisma = {
  user: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  vendor: { count: jest.fn(), groupBy: jest.fn() },
  booking: { count: jest.fn(), findMany: jest.fn() },
  payment: { aggregate: jest.fn() },
  category: { findMany: jest.fn() },
  adminAction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

const mockUser = {
  id: 5, name: 'Jane Doe', email: 'jane@test.com',
  role: 'CUSTOMER', isBlocked: false, isEmailVerified: true,
  deletedAt: null, _count: { bookings: 3 },
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────
  describe('getDashboardStats', () => {
    it('should return platform stats', async () => {
      mockPrisma.user.count.mockResolvedValue(120);
      mockPrisma.vendor.count.mockResolvedValue(30);
      mockPrisma.booking.count.mockResolvedValue(500);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 48000 } });
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.vendor.groupBy.mockResolvedValue([{ categoryId: 1, _count: { id: 10 } }]);
      mockPrisma.category.findMany.mockResolvedValue([{ id: 1, name: 'Barber' }]);

      const result = await service.getDashboardStats();
      expect(result.totalUsers).toBe(120);
      expect(result.totalVendors).toBe(30);
      expect(result.totalBookings).toBe(500);
      expect(result.totalRevenue).toBe(48000);
      expect(result.vendorsByCategory).toEqual([{ name: 'Barber', count: 10 }]);
    });

    it('should return 0 revenue when no payments', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.vendor.count.mockResolvedValue(0);
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.booking.findMany.mockResolvedValue([]);
      mockPrisma.vendor.groupBy.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats();
      expect(result.totalRevenue).toBe(0);
    });
  });

  // ─────────────────────────────────────────
  // GET USERS
  // ─────────────────────────────────────────
  describe('getUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].email).toBe('jane@test.com');
    });

    it('should filter users by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      await service.getUsers(1, 20, 'jane');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'jane' }) }),
            ]),
          }),
        }),
      );
    });

    it('should return empty list when no users match', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.getUsers(1, 20, 'nobody');
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should calculate correct totalPages', async () => {
      mockPrisma.user.findMany.mockResolvedValue(Array(20).fill(mockUser));
      mockPrisma.user.count.mockResolvedValue(45);

      const result = await service.getUsers(1, 20);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  // ─────────────────────────────────────────
  // BLOCK USER
  // ─────────────────────────────────────────
  describe('blockUser', () => {
    it('should block a user and log admin action', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isBlocked: true });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.blockUser(1, 5);
      expect(result.isBlocked).toBe(true);
      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: 1,
          targetId: 5,
          targetType: AdminTargetType.USER,
          action: AdminActionType.BLOCK_USER,
        }),
      });
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.blockUser(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // UNBLOCK USER
  // ─────────────────────────────────────────
  describe('unblockUser', () => {
    it('should unblock a user and log admin action', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, isBlocked: true });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isBlocked: false });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.unblockUser(1, 5);
      expect(result.isBlocked).toBe(false);
      expect(mockPrisma.adminAction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: AdminActionType.UNBLOCK_USER }),
      });
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.unblockUser(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // AUDIT LOG
  // ─────────────────────────────────────────
  describe('getAuditLog', () => {
    const mockAction = {
      id: 1, adminId: 1, targetId: 5,
      targetType: AdminTargetType.USER,
      action: AdminActionType.BLOCK_USER,
      reason: null, createdAt: new Date(),
    };

    it('should return paginated audit log', async () => {
      mockPrisma.adminAction.findMany.mockResolvedValue([mockAction]);
      mockPrisma.adminAction.count.mockResolvedValue(1);

      const result = await service.getAuditLog(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].action).toBe(AdminActionType.BLOCK_USER);
    });

    it('should return empty log when no actions', async () => {
      mockPrisma.adminAction.findMany.mockResolvedValue([]);
      mockPrisma.adminAction.count.mockResolvedValue(0);

      const result = await service.getAuditLog(1, 20);
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should paginate correctly', async () => {
      mockPrisma.adminAction.findMany.mockResolvedValue(Array(20).fill(mockAction));
      mockPrisma.adminAction.count.mockResolvedValue(60);

      const result = await service.getAuditLog(1, 20);
      expect(result.meta.totalPages).toBe(3);
    });
  });
});
