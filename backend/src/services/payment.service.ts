import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto, RefundPaymentDto, VerifyPaymentDto } from '../dto/payment.dto';
import { BookingStatus, NotificationType, PaymentStatus, PaymentTransactionStatus } from '@prisma/client';
import { NotificationService } from './notification.service';

@Injectable()
export class PaymentService {
  private razorpay: any;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID ?? '',
      key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
    });
  }

  // ─── Create Order ──────────────────────────────────────────────────────────

  async createOrder(userId: number, dto: CreatePaymentIntentDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, customerId: userId, deletedAt: null },
      include: { service: true, vendor: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Cannot pay for a cancelled booking');
    if (booking.paymentStatus === PaymentStatus.PAID) throw new BadRequestException('Booking is already paid');

    const amountPaise = Math.round(booking.service.price * 100);

    const order = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `booking_${booking.id}`,
      notes: {
        bookingId: booking.id.toString(),
        userId: userId.toString(),
        vendorId: booking.vendorId.toString(),
        serviceName: booking.service.name,
      },
    });

    await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        userId,
        amount: booking.service.price,
        currency: 'INR',
        status: PaymentTransactionStatus.PENDING,
        stripePaymentIntentId: order.id, // reusing field for razorpay order id
      },
      update: {
        stripePaymentIntentId: order.id,
        status: PaymentTransactionStatus.PENDING,
      },
    });

    return {
      orderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      bookingId: booking.id,
      service: booking.service.name,
      vendor: booking.vendor.businessName,
      customerName: booking.vendor.businessName,
    };
  }

  // ─── Verify Payment ────────────────────────────────────────────────────────

  async verifyPayment(userId: number, dto: VerifyPaymentDto) {
    // verify signature
    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? '')
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Payment verification failed — invalid signature');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { stripePaymentIntentId: dto.razorpayOrderId },
    });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.userId !== userId) throw new ForbiddenException('You are not authorized to verify this payment');

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentTransactionStatus.SUCCESS,
          stripeChargeId: dto.razorpayPaymentId,
        },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: BookingStatus.CONFIRMED,
        },
      }),
    ]);

    this.logger.log(`Payment verified for booking #${payment.bookingId}`);

    this.notifications.send({
      userId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Payment Successful',
      message: `Payment confirmed for booking #${payment.bookingId}`,
      metadata: { bookingId: payment.bookingId },
    });

    return { message: 'Payment verified successfully', bookingId: payment.bookingId };
  }

  // ─── Refund ────────────────────────────────────────────────────────────────

  async refund(requesterId: number, bookingId: number, dto: RefundPaymentDto, isAdmin: boolean) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (!isAdmin && payment.userId !== requesterId) throw new ForbiddenException();
    if (payment.status !== PaymentTransactionStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    const refund = await this.razorpay.payments.refund(payment.stripeChargeId!, {
      amount: Math.round(payment.amount * 100),
      notes: { reason: dto.reason ?? 'Customer requested refund' },
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentTransactionStatus.REFUNDED, refundId: refund.id },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: PaymentStatus.REFUNDED, status: BookingStatus.CANCELLED },
      }),
    ]);

    this.notifications.send({
      userId: payment.userId,
      type: NotificationType.PAYMENT_REFUNDED,
      title: 'Payment Refunded',
      message: `Your refund for booking #${bookingId} has been processed`,
      metadata: { bookingId, refundId: refund.id },
    });

    return { message: 'Refund processed successfully', refundId: refund.id };
  }

  // ─── Payment History ───────────────────────────────────────────────────────

  async getHistory(userId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              vendor: { select: { id: true, businessName: true } },
              service: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return { data: payments, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
