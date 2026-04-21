import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto, SetBusinessHoursDto, UpdateBookingStatusDto } from '../dto/booking.dto';
import { PrismaService } from '../prisma/prisma.service';

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const hasTimeCollision = (
  startA: number, endA: number,
  startB: number, endB: number,
): boolean => Math.max(startA, startB) < Math.min(endA, endB);

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async setBusinessHours(shopId: number, ownerId: number, dto: SetBusinessHoursDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== ownerId) throw new ForbiddenException('Unauthorized');

    return Promise.all(
      dto.schedules.map((s) =>
        this.prisma.businessHours.upsert({
          where: { shopId_dayOfWeek: { shopId, dayOfWeek: s.dayOfWeek } },
          update: { openTime: s.openTime, closeTime: s.closeTime },
          create: { shopId, dayOfWeek: s.dayOfWeek, openTime: s.openTime, closeTime: s.closeTime },
        }),
      ),
    );
  }

  async getAvailability(shopId: number, date: string, serviceId: number) {
    const dayOfWeek = new Date(date).getUTCDay();
    const hours = await this.prisma.businessHours.findUnique({
      where: { shopId_dayOfWeek: { shopId, dayOfWeek } },
    });
    if (!hours) return [];

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const existingBookings = await this.prisma.booking.findMany({
      where: { shopId, date, status: { not: 'CANCELLED' } },
    });

    const slots: string[] = [];
    let current = timeToMinutes(hours.openTime);
    const close = timeToMinutes(hours.closeTime);

    while (current + service.duration <= close) {
      const slotEnd = current + service.duration;
      const hasCollision = existingBookings.some((b) =>
        hasTimeCollision(current, slotEnd, timeToMinutes(b.startTime), timeToMinutes(b.endTime)),
      );
      if (!hasCollision) slots.push(minutesToTime(current));
      current += 30;
    }

    return slots;
  }

  async createBooking(userId: number, dto: CreateBookingDto) {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const startMins = timeToMinutes(dto.startTime);
    const endMins = startMins + service.duration;

    const existingBookings = await this.prisma.booking.findMany({
      where: { shopId: dto.shopId, date: dto.date, status: { not: 'CANCELLED' } },
    });

    const collision = existingBookings.some((b) =>
      hasTimeCollision(startMins, endMins, timeToMinutes(b.startTime), timeToMinutes(b.endTime)),
    );
    if (collision) throw new BadRequestException('Collision detected. Slot unavailable.');

    return this.prisma.booking.create({
      data: { userId, shopId: dto.shopId, serviceId: dto.serviceId, date: dto.date, startTime: dto.startTime, endTime: minutesToTime(endMins) },
    });
  }

  getCustomerBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        shop: { select: { id: true, name: true, location: true } },
        service: { select: { id: true, name: true, price: true, duration: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShopBookings(shopId: number, ownerId: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== ownerId) throw new ForbiddenException('Unauthorized');

    return this.prisma.booking.findMany({
      where: { shopId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, name: true, price: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async updateBookingStatus(id: number, userId: number, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: { shop: true } });
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwner = booking.shop.ownerId === userId;
    const isCustomer = booking.userId === userId;

    if (!isOwner && !isCustomer) throw new ForbiddenException('Unauthorized action');
    if (isCustomer && dto.status !== 'CANCELLED') throw new ForbiddenException('Customers can only cancel bookings');

    return this.prisma.booking.update({ where: { id }, data: { status: dto.status } });
  }
}
