import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, VendorReplyDto } from '../dto/review.dto';
import { BookingStatus, AdminActionType, AdminTargetType } from '@prisma/client';
import { AlertService } from './alert.service';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private alert: AlertService,
  ) {}

  // ─── Create Review ─────────────────────────────────────────────────────────

  async create(customerId: number, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, customerId, deletedAt: null },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
    }

    const existing = await this.prisma.review.findUnique({ where: { bookingId: dto.bookingId } });
    if (existing) throw new ConflictException('You have already reviewed this booking');

    const review = await this.prisma.review.create({
      data: {
        customerId,
        vendorId: booking.vendorId,
        bookingId: dto.bookingId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        customer: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Bot 28 — Low Rating Alert
    if (dto.rating <= 2) {
      this.alert.raise({
        type: 'RATING_BOMB',
        severity: 'MEDIUM',
        targetId: String(booking.vendorId),
        targetType: 'VENDOR',
        message: `Vendor #${booking.vendorId} received a ${dto.rating}-star review. Review it immediately.`,
        meta: { vendorId: booking.vendorId, rating: dto.rating, comment: dto.comment },
      }).catch(() => {});
    }

    return review;
  }

  // ─── Get Vendor Reviews (public) ───────────────────────────────────────────

  async getVendorReviews(vendorId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { vendorId, isVisible: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where: { vendorId, isVisible: true } }),
      this.prisma.review.aggregate({
        where: { vendorId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    // rating breakdown
    const breakdown = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { vendorId, isVisible: true },
      _count: { rating: true },
    });

    const ratingBreakdown = [5, 4, 3, 2, 1].map(r => ({
      rating: r,
      count: breakdown.find(b => b.rating === r)?._count.rating || 0,
    }));

    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      stats: {
        averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
        totalReviews: stats._count.rating,
        ratingBreakdown,
      },
    };
  }

  // ─── Get My Reviews (customer) ─────────────────────────────────────────────

  async getMyReviews(customerId: number) {
    return this.prisma.review.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, businessName: true, logo: true } },
      },
    });
  }

  // ─── Vendor Reply ──────────────────────────────────────────────────────────

  async vendorReply(userId: number, reviewId: number, dto: VendorReplyDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, vendorId: vendor.id },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.vendorReply) throw new BadRequestException('You have already replied to this review');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { vendorReply: dto.vendorReply },
    });
  }

  // ─── Check if booking is reviewable ───────────────────────────────────────

  async canReview(customerId: number, bookingId: number) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId, deletedAt: null },
    });
    if (!booking || booking.status !== BookingStatus.COMPLETED) return { canReview: false };

    const existing = await this.prisma.review.findUnique({ where: { bookingId } });
    return { canReview: !existing };
  }

  // ─── Admin: Hide / Show / Delete ──────────────────────────────────────────

  async adminGetAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          vendor: { select: { id: true, businessName: true } },
        },
      }),
      this.prisma.review.count(),
    ]);
    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminHide(adminId: number, reviewId: number) {
    return this.adminToggleVisibility(adminId, reviewId, false);
  }

  async adminShow(adminId: number, reviewId: number) {
    return this.adminToggleVisibility(adminId, reviewId, true);
  }

  async adminDelete(adminId: number, reviewId: number) {
    const review = await this.findOrThrow(reviewId);
    await this.prisma.review.delete({ where: { id: reviewId } });
    await this.logAdminAction(adminId, reviewId, AdminActionType.DELETE);
    return { message: 'Review deleted' };
  }

  private async adminToggleVisibility(adminId: number, reviewId: number, isVisible: boolean) {
    await this.findOrThrow(reviewId);
    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isVisible },
    });
    await this.logAdminAction(adminId, reviewId, isVisible ? AdminActionType.SHOW_REVIEW : AdminActionType.HIDE_REVIEW);
    return updated;
  }

  private async findOrThrow(id: number) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private logAdminAction(adminId: number, targetId: number, action: AdminActionType) {
    return this.prisma.adminAction.create({
      data: { adminId, targetId, targetType: AdminTargetType.REVIEW, action },
    });
  }
}
