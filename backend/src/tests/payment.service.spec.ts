import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../services/payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../services/notification.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingStatus, PaymentStatus, PaymentTransactionStatus } from '@prisma/client';
import * as crypto from 'crypto';

// mock razorpay
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn().mockResolvedValue({ id: 'order_123', amount: 20000 }) },
    payments: { refund: jest.fn().mockResolvedValue({ id: 'refund_123' }) },
  }));
});

const mockPrisma = {
  booking: { findFirst: jest.fn(), update: jest.fn() },
  payment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
};

const mockNotifications = { send: jest.fn() };

const mockBooking = {
  id: 1, customerId: 10, vendorId: 5,
  status: BookingStatus.PENDING,
  paymentStatus: PaymentStatus.UNPAID,
  deletedAt: null,
  service: { id: 1, name: 'Haircut', price: 200 },
  vendor: { id: 5, businessName: 'Barber Shop', userId: 20 },
};

const mockPayment = {
  id: 1, bookingId: 1, userId: 10,
  amount: 200, currency: 'INR',
  status: PaymentTransactionStatus.SUCCESS,
  stripePaymentIntentId: 'order_123',
  stripeChargeId: 'pay_123',
  refundId: null,
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // CREATE ORDER
  // ─────────────────────────────────────────
  describe('createOrder', () => {
    it('should create a Razorpay order for own booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(mockBooking);
      mockPrisma.payment.upsert.mockResolvedValue({});

      const result = await service.createOrder(10, { bookingId: 1 });
      expect(result.orderId).toBe('order_123');
      expect(result.bookingId).toBe(1);
    });

    it('should throw if booking not found or does not belong to user', async () => {
      // customerId=99 does not own booking — findFirst returns null
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.createOrder(99, { bookingId: 1 })).rejects.toThrow(NotFoundException);
    });

    it('should throw if booking is cancelled', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, status: BookingStatus.CANCELLED });
      await expect(service.createOrder(10, { bookingId: 1 })).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking is already paid', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({ ...mockBooking, paymentStatus: PaymentStatus.PAID });
      await expect(service.createOrder(10, { bookingId: 1 })).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // VERIFY PAYMENT
  // ─────────────────────────────────────────
  describe('verifyPayment', () => {
    const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
    const validSig = crypto.createHmac('sha256', secret).update('order_123|pay_123').digest('hex');

    const validDto = {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
      razorpaySignature: validSig,
      bookingId: 1,
    };

    it('should verify payment with valid signature for own payment', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ ...mockPayment, status: PaymentTransactionStatus.PENDING });
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.send.mockResolvedValue({});

      const result = await service.verifyPayment(10, validDto);
      expect(result.message).toContain('verified');
    });

    it('should throw if signature is invalid', async () => {
      await expect(service.verifyPayment(10, { ...validDto, razorpaySignature: 'bad_sig' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if payment record not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.verifyPayment(10, validDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if payment belongs to a different user', async () => {
      // payment.userId=10 but requester is userId=99
      mockPrisma.payment.findFirst.mockResolvedValue({ ...mockPayment, userId: 10 });
      await expect(service.verifyPayment(99, validDto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // REFUND
  // ─────────────────────────────────────────
  describe('refund', () => {
    it('should refund own payment as customer', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.send.mockResolvedValue({});

      const result = await service.refund(10, 1, {}, false);
      expect(result.message).toContain('Refund processed');
    });

    it('should allow admin to refund any payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockNotifications.send.mockResolvedValue({});

      // userId=99 is not the owner but isAdmin=true
      const result = await service.refund(99, 1, {}, true);
      expect(result.message).toContain('Refund processed');
    });

    it('should throw if non-owner customer tries to refund', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment); // userId=10
      // userId=99 is not owner, isAdmin=false
      await expect(service.refund(99, 1, {}, false)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.refund(10, 99, {}, false)).rejects.toThrow(NotFoundException);
    });

    it('should throw if payment is not in SUCCESS state', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ ...mockPayment, status: PaymentTransactionStatus.PENDING });
      await expect(service.refund(10, 1, {}, false)).rejects.toThrow(BadRequestException);
    });

    it('should throw if payment is already refunded', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ ...mockPayment, status: PaymentTransactionStatus.REFUNDED });
      await expect(service.refund(10, 1, {}, false)).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // PAYMENT HISTORY
  // ─────────────────────────────────────────
  describe('getHistory', () => {
    it('should return only the requesting user\'s payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await service.getHistory(10, 1, 10);
      expect(result.data).toHaveLength(1);
      // verify the query was scoped to userId=10
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10 } }),
      );
    });

    it('should not return payments of other users', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      const result = await service.getHistory(99, 1, 10);
      expect(result.data).toHaveLength(0);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 99 } }),
      );
    });
  });
});
