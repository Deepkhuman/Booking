import { Test, TestingModule } from '@nestjs/testing';
import { VendorService } from '../services/vendor.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VendorStatus, BookingType } from '@prisma/client';

const mockPrisma = {
  vendor: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
  adminAction: {
    create: jest.fn(),
  },
};

const mockVendor = {
  id: 1,
  userId: 10,
  businessName: "John's Barbershop",
  slug: 'johns-barbershop',
  status: VendorStatus.PENDING,
  isActive: true,
  deletedAt: null,
};

const mockCategory = { id: 1, name: 'Barber', slug: 'barber', isActive: true };

describe('VendorService', () => {
  let service: VendorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────
  describe('register', () => {
    const dto = { businessName: "John's Barbershop", categoryId: 1 };

    it('should register a vendor successfully', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.vendor.create.mockResolvedValue({ ...mockVendor, category: mockCategory });

      const result = await service.register(10, dto);
      expect(result.businessName).toBe("John's Barbershop");
      expect(mockPrisma.vendor.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if vendor profile already exists', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      await expect(service.register(10, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw if category is invalid or inactive', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(service.register(10, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if category is inactive', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue({ ...mockCategory, isActive: false });
      await expect(service.register(10, dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // GET MY PROFILE
  // ─────────────────────────────────────────
  describe('getMyProfile', () => {
    it('should return vendor profile', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      const result = await service.getMyProfile(10);
      expect(result.userId).toBe(10);
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.getMyProfile(10)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // UPDATE MY PROFILE
  // ─────────────────────────────────────────
  describe('updateMyProfile', () => {
    it('should update vendor profile', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockResolvedValue({ ...mockVendor, city: 'Mumbai' });

      const result = await service.updateMyProfile(10, { city: 'Mumbai' });
      expect(result.city).toBe('Mumbai');
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.updateMyProfile(10, { city: 'Mumbai' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if vendor is blocked', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ ...mockVendor, status: VendorStatus.BLOCKED });
      await expect(service.updateMyProfile(10, { city: 'Mumbai' })).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // FIND ALL (public)
  // ─────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated approved vendors', async () => {
      mockPrisma.vendor.findMany.mockResolvedValue([mockVendor]);
      mockPrisma.vendor.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty list when no vendors match', async () => {
      mockPrisma.vendor.findMany.mockResolvedValue([]);
      mockPrisma.vendor.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 10, city: 'Unknown' });
      expect(result.data).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────
  // FIND BY ID (public)
  // ─────────────────────────────────────────
  describe('findById', () => {
    it('should return vendor by id', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      const result = await service.findById(1);
      expect(result.id).toBe(1);
    });

    it('should throw if vendor not found or not approved', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(null);
      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // ADMIN: APPROVE
  // ─────────────────────────────────────────
  describe('approve', () => {
    it('should approve a pending vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockResolvedValue({ ...mockVendor, status: VendorStatus.APPROVED });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.approve(1, 1, {});
      expect(result.status).toBe(VendorStatus.APPROVED);
    });

    it('should throw if vendor is already approved', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue({ ...mockVendor, status: VendorStatus.APPROVED });
      await expect(service.approve(1, 1, {})).rejects.toThrow(ConflictException);
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(null);
      await expect(service.approve(1, 99, {})).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // ADMIN: SUSPEND / BLOCK / UNBLOCK
  // ─────────────────────────────────────────
  describe('suspend', () => {
    it('should suspend a vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockResolvedValue({ ...mockVendor, status: VendorStatus.SUSPENDED });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.suspend(1, 1, { reason: 'Violation' });
      expect(result.status).toBe(VendorStatus.SUSPENDED);
    });
  });

  describe('block', () => {
    it('should block a vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockResolvedValue({ ...mockVendor, status: VendorStatus.BLOCKED });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.block(1, 1, { reason: 'Fraud' });
      expect(result.status).toBe(VendorStatus.BLOCKED);
    });
  });

  describe('unblock', () => {
    it('should unblock a vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue({ ...mockVendor, status: VendorStatus.BLOCKED });
      mockPrisma.vendor.update.mockResolvedValue({ ...mockVendor, status: VendorStatus.APPROVED });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.unblock(1, 1, {});
      expect(result.status).toBe(VendorStatus.APPROVED);
    });
  });

  // ─────────────────────────────────────────
  // ADMIN: DELETE
  // ─────────────────────────────────────────
  describe('remove', () => {
    it('should soft delete a vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendor.update.mockResolvedValue({ ...mockVendor, deletedAt: new Date() });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.remove(1, 1);
      expect(result.deletedAt).toBeDefined();
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(null);
      await expect(service.remove(1, 99)).rejects.toThrow(NotFoundException);
    });
  });
});
