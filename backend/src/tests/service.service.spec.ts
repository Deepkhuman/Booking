import { Test, TestingModule } from '@nestjs/testing';
import { ServiceService } from '../services/service.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VendorStatus } from '@prisma/client';

const mockPrisma = {
  vendor: { findUnique: jest.fn(), findFirst: jest.fn() },
  vendorService: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  serviceImage: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  adminAction: { create: jest.fn() },
};

const mockCloudinary = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

const mockVendor = { id: 1, userId: 10, status: VendorStatus.APPROVED };
const mockService = { id: 5, vendorId: 1, name: 'Haircut', price: 200, deletedAt: null };
const mockImage = { id: 3, serviceId: 5, url: 'https://res.cloudinary.com/test/image.jpg', publicId: 'services/abc123' };

describe('ServiceService', () => {
  let service: ServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────
  describe('create', () => {
    it('should create a service for approved vendor', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.create.mockResolvedValue({ ...mockService, images: [] });

      const result = await service.create(10, { name: 'Haircut', price: 200 });
      expect(result.name).toBe('Haircut');
      expect(mockPrisma.vendorService.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if vendor profile not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.create(10, { name: 'Haircut', price: 200 })).rejects.toThrow(NotFoundException);
    });

    it('should throw if vendor is not approved', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ ...mockVendor, status: VendorStatus.PENDING });
      await expect(service.create(10, { name: 'Haircut', price: 200 })).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // FIND BY VENDOR
  // ─────────────────────────────────────────
  describe('findByVendor', () => {
    it('should return services for a vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findMany.mockResolvedValue([{ ...mockService, images: [] }]);

      const result = await service.findByVendor(1);
      expect(result).toHaveLength(1);
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(null);
      await expect(service.findByVendor(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────
  describe('update', () => {
    it('should update a service', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, price: 300, images: [] });

      const result = await service.update(10, 5, { price: 300 });
      expect(result.price).toBe(300);
    });

    it('should throw if service not found or not owned', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      await expect(service.update(10, 99, { price: 300 })).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────
  describe('remove', () => {
    it('should soft delete service and remove cloudinary images', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findMany.mockResolvedValue([mockImage]);
      mockCloudinary.deleteImage.mockResolvedValue({});
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, deletedAt: new Date() });

      const result = await service.remove(10, 5);
      expect(result.deletedAt).toBeDefined();
      expect(mockCloudinary.deleteImage).toHaveBeenCalledWith('services/abc123');
    });
  });

  // ─────────────────────────────────────────
  // UPLOAD IMAGES
  // ─────────────────────────────────────────
  describe('uploadImages', () => {
    const mockFile = { buffer: Buffer.from(''), mimetype: 'image/jpeg', size: 1000 } as Express.Multer.File;

    it('should upload images successfully', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.serviceImage.count.mockResolvedValue(0);
      mockCloudinary.uploadImage.mockResolvedValue({ url: mockImage.url, publicId: mockImage.publicId });
      mockPrisma.serviceImage.create.mockResolvedValue(mockImage);

      const result = await service.uploadImages(10, 5, [mockFile]);
      expect(result).toHaveLength(1);
      expect(mockCloudinary.uploadImage).toHaveBeenCalledTimes(1);
    });

    it('should throw if image limit exceeded', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.serviceImage.count.mockResolvedValue(4);

      await expect(service.uploadImages(10, 5, [mockFile, mockFile])).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // DELETE IMAGE
  // ─────────────────────────────────────────
  describe('deleteImage', () => {
    it('should delete image from cloudinary and db', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findFirst.mockResolvedValue(mockImage);
      mockCloudinary.deleteImage.mockResolvedValue({});
      mockPrisma.serviceImage.delete.mockResolvedValue(mockImage);

      const result = await service.deleteImage(10, 5, 3);
      expect(mockCloudinary.deleteImage).toHaveBeenCalledWith('services/abc123');
      expect(result.id).toBe(3);
    });

    it('should throw if image not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findFirst.mockResolvedValue(null);

      await expect(service.deleteImage(10, 5, 99)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // ADMIN: ENABLE / DISABLE
  // ─────────────────────────────────────────
  describe('adminEnable', () => {
    it('should enable a service', async () => {
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, isEnabled: true });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.adminEnable(1, 5);
      expect(result.isEnabled).toBe(true);
    });
  });

  describe('adminDisable', () => {
    it('should disable a service', async () => {
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.vendorService.update.mockResolvedValue({ ...mockService, isEnabled: false });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.adminDisable(1, 5);
      expect(result.isEnabled).toBe(false);
    });

    it('should throw if service not found', async () => {
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      await expect(service.adminDisable(1, 99)).rejects.toThrow(NotFoundException);
    });
  });
});
