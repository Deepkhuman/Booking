import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto, SetBusinessHoursDto } from '../dto/booking.dto';
import { BookingStatus, BookingType, NotificationType, VendorStatus } from '@prisma/client';
import { NotificationService } from './notification.service';
import { AlertService } from './alert.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
    private alert: AlertService,
  ) {}

  // ─── Create Booking ────────────────────────────────────────────────────────

  async create(customerId: number, dto: CreateBookingDto) {
    // validate vendor
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, status: VendorStatus.APPROVED, isActive: true, deletedAt: null },
    });
    if (!vendor) throw new NotFoundException('Vendor not found or not available');

    // validate service belongs to vendor
    const service = await this.prisma.vendorService.findFirst({
      where: { id: dto.serviceId, vendorId: dto.vendorId, isActive: true, isEnabled: true, deletedAt: null },
    });
    if (!service) throw new NotFoundException('Service not found or not available');

    // validate booking type matches vendor
    if (dto.bookingType !== vendor.bookingType) {
      throw new BadRequestException(`This vendor only accepts ${vendor.bookingType} bookings`);
    }

    // check for slot conflicts (SLOT_BASED & HOURLY)
    if (dto.bookingType === BookingType.SLOT_BASED || dto.bookingType === BookingType.HOURLY) {
      if (!dto.date || !dto.startTime) throw new BadRequestException('date and startTime are required');
      await this.checkSlotConflict(dto.vendorId, dto.date, dto.startTime, dto.endTime);
    }

    // check for daily conflicts
    if (dto.bookingType === BookingType.DAILY) {
      if (!dto.checkIn || !dto.checkOut) throw new BadRequestException('checkIn and checkOut are required');
      const checkIn = new Date(dto.checkIn);
      const checkOut = new Date(dto.checkOut);
      if (checkOut <= checkIn) throw new BadRequestException('checkOut must be after checkIn');
      await this.checkDailyConflict(dto.vendorId, checkIn, checkOut);
    }

    const booking = await this.prisma.booking.create({
      data: {
        customerId,
        vendorId: dto.vendorId,
        serviceId: dto.serviceId,
        bookingType: dto.bookingType,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        quantity: dto.quantity ?? 1,
        notes: dto.notes,
      },
      include: {
        vendor: { select: { id: true, businessName: true, slug: true, userId: true } },
        service: { select: { id: true, name: true, price: true } },
      },
    });

    // notify vendor of new booking
    this.notifications.send({
      userId: (booking.vendor as any).userId,
      type: NotificationType.BOOKING_CREATED,
      title: 'New Booking',
      message: `You have a new booking for ${booking.service.name}`,
      metadata: { bookingId: booking.id },
    });

    return booking;
  }

  // ─── Customer: My Bookings ─────────────────────────────────────────────────

  async getMyBookings(customerId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { customerId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, businessName: true, slug: true, logo: true, city: true } },
          service: { select: { id: true, name: true, price: true } },
          review: { select: { id: true } },
        },
      }),
      this.prisma.booking.count({ where: { customerId, deletedAt: null } }),
    ]);
    return { data: bookings, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Vendor: Their Bookings ────────────────────────────────────────────────

  async getVendorBookings(userId: number, page = 1, limit = 10, status?: BookingStatus) {
    const vendor = await this.getVendorByUserOrThrow(userId);
    const where: any = { vendorId: vendor.id, deletedAt: null };
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          service: { select: { id: true, name: true, price: true } },
          review: { select: { id: true, rating: true, comment: true, vendorReply: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: bookings, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Vendor: Confirm ──────────────────────────────────────────────────────

  async confirm(userId: number, bookingId: number) {
    const booking = await this.getVendorBookingOrThrow(userId, bookingId);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }
    // check vendor is still active
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (vendor && vendor.status !== 'APPROVED') {
      throw new ForbiddenException('Your vendor account is not active');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });

    this.notifications.send({
      userId: booking.customerId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Booking Confirmed',
      message: 'Your booking has been confirmed by the vendor',
      metadata: { bookingId },
    });

    return updated;
  }

  // ─── Cancel (customer or vendor) ──────────────────────────────────────────

  async cancel(userId: number, bookingId: number, role: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { vendor: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (role === 'CUSTOMER' && booking.customerId !== userId) throw new ForbiddenException();
    if (role === 'VENDOR') {
      const vendor = await this.getVendorByUserOrThrow(userId);
      if (booking.vendorId !== vendor.id) throw new ForbiddenException();
    }

    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(`Booking is already ${booking.status.toLowerCase()}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    // notify the other party
    const notifyUserId = role === 'CUSTOMER' ? booking.vendor.userId : booking.customerId;
    this.notifications.send({
      userId: notifyUserId,
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      message: 'A booking has been cancelled',
      metadata: { bookingId },
    });

    return updated;
  }

  // ─── Vendor: Complete ─────────────────────────────────────────────────────

  async complete(userId: number, bookingId: number) {
    const booking = await this.getVendorBookingOrThrow(userId, bookingId);
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be marked complete');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    });

    this.notifications.send({
      userId: booking.customerId,
      type: NotificationType.BOOKING_COMPLETED,
      title: 'Booking Completed',
      message: 'Your booking is complete. Leave a review!',
      metadata: { bookingId },
    });

    // Bot 27 — Vendor Milestone
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (vendor) {
      const count = await this.prisma.booking.count({
        where: { vendorId: vendor.id, status: BookingStatus.COMPLETED, deletedAt: null },
      });
      if ([10, 50, 100, 500, 1000].includes(count)) {
        this.notifications.send({
          userId,
          type: NotificationType.BOOKING_COMPLETED,
          title: `🎉 Milestone: ${count} Bookings!`,
          message: `Congratulations! You've completed ${count} bookings on Plugin. Keep it up!`,
          metadata: { milestone: count },
        });
      }
    }

    return updated;
  }

  // ─── Get Available Slots ───────────────────────────────────────────────────

  async getAvailability(vendorId: number, date: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, status: VendorStatus.APPROVED, isActive: true, deletedAt: null },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (vendor.bookingType === BookingType.NO_BOOKING) {
      throw new BadRequestException('This vendor does not accept bookings');
    }

    const dayOfWeek = new Date(date).getDay();
    const hours = await this.prisma.businessHours.findUnique({
      where: { vendorId_dayOfWeek: { vendorId, dayOfWeek } },
    });

    if (!hours || hours.isClosed) return { date, slots: [], message: 'Closed on this day' };

    if (vendor.bookingType === BookingType.DAILY) {
      const conflict = await this.prisma.booking.findFirst({
        where: {
          vendorId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          checkIn: { lte: new Date(date) },
          checkOut: { gt: new Date(date) },
          deletedAt: null,
        },
      });
      return { date, available: !conflict };
    }

    // SLOT_BASED — generate slots
    const slots = this.generateSlots(hours.openTime, hours.closeTime, hours.slotDuration);

    // get booked slots for this date
    const booked = await this.prisma.booking.findMany({
      where: {
        vendorId,
        date,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        deletedAt: null,
      },
      select: { startTime: true },
    });

    const bookedTimes = new Set(booked.map((b) => b.startTime));
    return {
      date,
      slots: slots.map((slot) => ({ time: slot, available: !bookedTimes.has(slot) })),
    };
  }

  // ─── Business Hours (vendor) ───────────────────────────────────────────────

  async setBusinessHours(userId: number, dto: SetBusinessHoursDto) {
    const vendor = await this.getVendorByUserOrThrow(userId);

    const upserts = dto.schedules.map((s) =>
      this.prisma.businessHours.upsert({
        where: { vendorId_dayOfWeek: { vendorId: vendor.id, dayOfWeek: s.dayOfWeek } },
        create: {
          vendorId: vendor.id,
          dayOfWeek: s.dayOfWeek,
          openTime: s.openTime,
          closeTime: s.closeTime,
          slotDuration: s.slotDuration ?? 30,
          isClosed: s.isClosed,
        },
        update: {
          openTime: s.openTime,
          closeTime: s.closeTime,
          slotDuration: s.slotDuration ?? 30,
          isClosed: s.isClosed,
        },
      }),
    );

    return Promise.all(upserts);
  }

  async getBusinessHours(vendorId: number) {
    return this.prisma.businessHours.findMany({
      where: { vendorId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getVendorByUserOrThrow(userId: number) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  private async getVendorBookingOrThrow(userId: number, bookingId: number) {
    const vendor = await this.getVendorByUserOrThrow(userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, vendorId: vendor.id, deletedAt: null },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private async checkSlotConflict(vendorId: number, date: string, startTime: string, endTime?: string) {
    const conflict = await this.prisma.booking.findFirst({
      where: {
        vendorId,
        date,
        startTime,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        deletedAt: null,
      },
    });
    if (conflict) throw new ConflictException('This time slot is already booked');
  }

  private async checkDailyConflict(vendorId: number, checkIn: Date, checkOut: Date) {
    const conflict = await this.prisma.booking.findFirst({
      where: {
        vendorId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        deletedAt: null,
        AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
      },
    });
    if (conflict) throw new ConflictException('Vendor is not available for the selected dates');
  }

  private generateSlots(openTime: string, closeTime: string, slotDuration: number): string[] {
    const slots: string[] = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    let current = openH * 60 + openM;
    const end = closeH * 60 + closeM;

    while (current + slotDuration <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += slotDuration;
    }
    return slots;
  }
}
