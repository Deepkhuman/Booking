import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../services/category.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────
  describe('create', () => {
    it('should create a category successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ id: 1, name: 'Barber', slug: 'barber' });

      const result = await service.create({ name: 'Barber' });
      expect(result.slug).toBe('barber');
      expect(mockPrisma.category.create).toHaveBeenCalledTimes(1);
    });

    it('should generate correct slug from name', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ id: 1, name: 'Hair Salon', slug: 'hair-salon' });

      const result = await service.create({ name: 'Hair Salon' });
      expect(result.slug).toBe('hair-salon');
    });

    it('should throw if category already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, slug: 'barber' });
      await expect(service.create({ name: 'Barber' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 1, name: 'Barber', slug: 'barber' },
        { id: 2, name: 'Hotel', slug: 'hotel' },
      ]);

      const result = await service.findAll(1, 20);
      expect(result).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────
  // FIND BY SLUG
  // ─────────────────────────────────────────
  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 1, name: 'Barber', slug: 'barber' });
      const result = await service.findBySlug('barber');
      expect(result.slug).toBe('barber');
    });

    it('should throw if category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      await expect(service.findBySlug('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────
  describe('update', () => {
    it('should update category successfully', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 1, name: 'Barber', slug: 'barber' });
      mockPrisma.category.update.mockResolvedValue({ id: 1, name: 'Barbers', slug: 'barbers' });

      const result = await service.update(1, { name: 'Barbers' });
      expect(result.name).toBe('Barbers');
    });

    it('should throw if category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      await expect(service.update(99, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────
  describe('remove', () => {
    it('should soft delete category', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 1, name: 'Barber' });
      mockPrisma.category.update.mockResolvedValue({});

      const result = await service.remove(1);
      expect(result.message).toContain('deleted successfully');
    });

    it('should throw if category not found', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
