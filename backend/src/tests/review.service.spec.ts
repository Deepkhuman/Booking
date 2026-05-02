import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from '../services/review.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { AlertService } from '../services/alert.service';

const mockPrisma = {
  booking: { findFirst: jest.fn() },
  review: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  vendor: { findUnique: jest.fn() },
  adminAction: { create: jest.fn() },
};

const mockAlert = { raise: jest.fn() };

const mockBooking = {
  id: 10, customerId: 1, vendorId: 5,
  status: BookingStatus.COMPLETED, deletedAt: null,
};

const mockReview = {
  id: 20, customerId: 1, vendorId: 5, bookingId: 10,
  rating: 5, comment: 'Great!', vendorReply: null, isVisible: true,
};

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlertService, useValue: mockAlert },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // CREATE REVIEW
  // ─────────────────────────────────────────
  describe('create', () => {
    it('should create a review for a completed booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({ ...mockReview, customer: { id: 1, name: 'John', avatar: null } });

      const result = await service.create(1, { bookingId: 10, rating: 5, comment: 'Great!' });
      expect(result.rating).toBe(5);
      expect(mockPrisma.review.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if booking not found or does not belong to customer', async () => {
      // customerId=99 does not own booking
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.create(99, { bookingId: 10, rating: 5 })).rejects.toThrow(NotFoundException);
    });

    it('should throw if booking is not completed', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });
      await expect(service.create(1, { bookingId: 10, rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking is still pending', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.PENDING });
      await expect(service.create(1, { bookingId: 10, rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking is cancelled', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.CANCELLED });
      await expect(service.create(1, { bookingId: 10, rating: 5 })).rejects.toThrow(BadRequestException);
    });

    it('should throw if review already exists for this booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      await expect(service.create(1, { bookingId: 10, rating: 5 })).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────
  // VENDOR REPLY
  // ─────────────────────────────────────────
  describe('vendorReply', () => {
    it('should allow vendor to reply to their own review', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: 5, userId: 10 });
      mockPrisma.review.findFirst.mockResolvedValue(mockReview);
      mockPrisma.review.update.mockResolvedValue({ ...mockReview, vendorReply: 'Thank you!' });

      const result = await service.vendorReply(10, 20, { vendorReply: 'Thank you!' });
      expect(result.vendorReply).toBe('Thank you!');
    });

    it('should throw if vendor profile not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.vendorReply(10, 20, { vendorReply: 'Thanks' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if review does not belong to this vendor', async () => {
      // vendor.id=5 but review has vendorId=99
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: 5, userId: 10 });
      mockPrisma.review.findFirst.mockResolvedValue(null); // no match for vendorId=5
      await expect(service.vendorReply(10, 20, { vendorReply: 'Thanks' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if vendor already replied', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue({ id: 5, userId: 10 });
      mockPrisma.review.findFirst.mockResolvedValue({ ...mockReview, vendorReply: 'Already replied' });
      await expect(service.vendorReply(10, 20, { vendorReply: 'Again' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // CAN REVIEW
  // ─────────────────────────────────────────
  describe('canReview', () => {
    it('should return canReview: true for completed unreviewed booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.review.findUnique.mockResolvedValue(null);
      const result = await service.canReview(1, 10);
      expect(result.canReview).toBe(true);
    });

    it('should return canReview: false if already reviewed', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      const result = await service.canReview(1, 10);
      expect(result.canReview).toBe(false);
    });

    it('should return canReview: false if booking not completed', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });
      const result = await service.canReview(1, 10);
      expect(result.canReview).toBe(false);
    });

    it('should return canReview: false if booking belongs to different customer', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null); // customerId mismatch
      const result = await service.canReview(99, 10);
      expect(result.canReview).toBe(false);
    });
  });

  // ─────────────────────────────────────────
  // ADMIN: HIDE / SHOW / DELETE
  // ─────────────────────────────────────────
  describe('adminHide', () => {
    it('should hide a review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      mockPrisma.review.update.mockResolvedValue({ ...mockReview, isVisible: false });
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.adminHide(1, 20);
      expect(result.isVisible).toBe(false);
    });

    it('should throw if review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);
      await expect(service.adminHide(1, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminDelete', () => {
    it('should delete a review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      mockPrisma.review.delete.mockResolvedValue(mockReview);
      mockPrisma.adminAction.create.mockResolvedValue({});

      const result = await service.adminDelete(1, 20);
      expect(result.message).toBe('Review deleted');
    });

    it('should throw if review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);
      await expect(service.adminDelete(1, 99)).rejects.toThrow(NotFoundException);
    });
  });
});
