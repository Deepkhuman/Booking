import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../services/booking.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException, BadRequestException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { BookingStatus, BookingType, VendorStatus } from '@prisma/client';

import { NotificationService } from '../services/notification.service';
import { AlertService } from '../services/alert.service';

const mockPrisma = {
  vendor: { findFirst: jest.fn(), findUnique: jest.fn() },
  vendorService: { findFirst: jest.fn() },
  booking: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  businessHours: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

const mockNotifications = { send: jest.fn() };
const mockAlert = { raise: jest.fn() };

const mockVendor = { id: 1, userId: 10, status: VendorStatus.APPROVED, isActive: true, bookingType: BookingType.SLOT_BASED };
const mockService = { id: 5, vendorId: 1, name: 'Haircut', price: 200, isActive: true, isEnabled: true, deletedAt: null };
const mockBooking = {
  id: 100, customerId: 20, vendorId: 1, serviceId: 5,
  bookingType: BookingType.SLOT_BASED, date: '2026-05-01',
  startTime: '10:00', status: BookingStatus.PENDING,
  paymentStatus: 'UNPAID', deletedAt: null,
};

describe('BookingService', () => {
  let service: BookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotifications },
        { provide: AlertService, useValue: mockAlert },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────
  describe('create', () => {
    const dto = {
      vendorId: 1, serviceId: 5,
      bookingType: BookingType.SLOT_BASED,
      date: '2026-05-01', startTime: '10:00',
    };

    it('should create a SLOT_BASED booking', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.booking.findFirst.mockResolvedValue(null); // no conflict
      mockPrisma.booking.create.mockResolvedValue({ ...mockBooking, vendor: {}, service: {} });

      const result = await service.create(20, dto);
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(null);
      await expect(service.create(20, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if service not found', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(null);
      await expect(service.create(20, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if booking type does not match vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue({ ...mockVendor, bookingType: BookingType.DAILY });
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      await expect(service.create(20, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw on slot conflict', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking); // conflict exists
      await expect(service.create(20, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw if DAILY booking has checkOut before checkIn', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue({ ...mockVendor, bookingType: BookingType.DAILY });
      mockPrisma.vendorService.findFirst.mockResolvedValue(mockService);
      await expect(service.create(20, {
        vendorId: 1, serviceId: 5,
        bookingType: BookingType.DAILY,
        checkIn: '2026-05-05', checkOut: '2026-05-03',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // GET MY BOOKINGS
  // ─────────────────────────────────────────
  describe('getMyBookings', () => {
    it('should return paginated customer bookings', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([mockBooking]);
      mockPrisma.booking.count.mockResolvedValue(1);

      const result = await service.getMyBookings(20, 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  // ─────────────────────────────────────────
  // CONFIRM
  // ─────────────────────────────────────────
  describe('confirm', () => {
    it('should confirm a pending booking', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });

      const result = await service.confirm(10, 100);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw if booking is not pending', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });
      await expect(service.confirm(10, 100)).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.confirm(10, 999)).rejects.toThrow(NotFoundException);
    });

    it('should throw if vendor is suspended', async () => {
      mockPrisma.vendor.findUnique
        .mockResolvedValueOnce(mockVendor)
        .mockResolvedValueOnce({ ...mockVendor, status: 'SUSPENDED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      await expect(service.confirm(10, 100)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if vendor is blocked', async () => {
      mockPrisma.vendor.findUnique
        .mockResolvedValueOnce(mockVendor)
        .mockResolvedValueOnce({ ...mockVendor, status: 'BLOCKED' });
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      await expect(service.confirm(10, 100)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────
  describe('cancel', () => {
    it('should allow customer to cancel their own booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, vendor: {} });
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.CANCELLED });

      const result = await service.cancel(20, 100, 'CUSTOMER');
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw if customer tries to cancel someone else\'s booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, customerId: 99, vendor: {} });
      await expect(service.cancel(20, 100, 'CUSTOMER')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if booking is already completed', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.COMPLETED, vendor: {} });
      await expect(service.cancel(20, 100, 'CUSTOMER')).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.cancel(20, 999, 'CUSTOMER')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // COMPLETE
  // ─────────────────────────────────────────
  describe('complete', () => {
    it('should mark a confirmed booking as complete', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, status: BookingStatus.COMPLETED });

      const result = await service.complete(10, 100);
      expect(result.status).toBe(BookingStatus.COMPLETED);
    });

    it('should throw if booking is not confirmed', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking); // PENDING
      await expect(service.complete(10, 100)).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // AVAILABILITY
  // ─────────────────────────────────────────
  describe('getAvailability', () => {
    it('should return available slots for SLOT_BASED vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.businessHours.findUnique.mockResolvedValue({
        openTime: '09:00', closeTime: '11:00', slotDuration: 60, isClosed: false,
      });
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getAvailability(1, '2026-05-01');
      expect((result as any).slots).toHaveLength(2); // 09:00 and 10:00
      expect((result as any).slots[0]).toEqual({ time: '09:00', available: true });
    });

    it('should mark booked slots as unavailable', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.businessHours.findUnique.mockResolvedValue({
        openTime: '09:00', closeTime: '11:00', slotDuration: 60, isClosed: false,
      });
      mockPrisma.booking.findMany.mockResolvedValue([{ startTime: '09:00' }]);

      const result = await service.getAvailability(1, '2026-05-01');
      expect((result as any).slots[0]).toEqual({ time: '09:00', available: false });
      expect((result as any).slots[1]).toEqual({ time: '10:00', available: true });
    });

    it('should return closed message when vendor is closed', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue(mockVendor);
      mockPrisma.businessHours.findUnique.mockResolvedValue({ isClosed: true });

      const result = await service.getAvailability(1, '2026-05-01');
      expect((result as any).slots).toHaveLength(0);
    });

    it('should throw for NO_BOOKING vendor', async () => {
      mockPrisma.vendor.findFirst.mockResolvedValue({ ...mockVendor, bookingType: BookingType.NO_BOOKING });
      await expect(service.getAvailability(1, '2026-05-01')).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // BUSINESS HOURS
  // ─────────────────────────────────────────
  describe('setBusinessHours', () => {
    it('should upsert business hours for vendor', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);
      mockPrisma.businessHours.upsert.mockResolvedValue({});

      const result = await service.setBusinessHours(10, {
        schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', slotDuration: 30, isClosed: false }],
      });
      expect(mockPrisma.businessHours.upsert).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should throw if vendor not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);
      await expect(service.setBusinessHours(10, { schedules: [] })).rejects.toThrow(NotFoundException);
    });
  });
});
