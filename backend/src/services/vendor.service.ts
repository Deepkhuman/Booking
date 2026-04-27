import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVendorDto, UpdateVendorDto, AdminVendorActionDto, VendorQueryDto } from '../dto/vendor.dto';
import { VendorStatus, AdminActionType, AdminTargetType, NotificationType } from '@prisma/client';
import slugify from 'slugify';
import { NotificationService } from './notification.service';

@Injectable()
export class VendorService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  // ─── Vendor Registration ───────────────────────────────────────────────────

  async register(userId: number, dto: RegisterVendorDto) {
    const existing = await this.prisma.vendor.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('You already have a registered vendor profile');

    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category || !category.isActive) throw new BadRequestException('Invalid or inactive category');

    const slug = await this.generateSlug(dto.businessName);

    return this.prisma.vendor.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        businessName: dto.businessName,
        slug,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        pincode: dto.pincode,
        lat: dto.lat,
        lng: dto.lng,
        bookingType: dto.bookingType,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  // ─── Get Own Profile ───────────────────────────────────────────────────────

  async getMyProfile(userId: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true } },
        _count: { select: { services: true, bookings: true, reviews: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    return vendor;
  }

  // ─── Update Own Profile ────────────────────────────────────────────────────

  async updateMyProfile(userId: number, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    if (vendor.status === VendorStatus.BLOCKED) throw new ForbiddenException('Your account is blocked');

    return this.prisma.vendor.update({
      where: { userId },
      data: dto,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  // ─── Public: List Approved Vendors ────────────────────────────────────────

  async findAll(query: VendorQueryDto) {
    const { page = 1, limit = 10, category, city, bookingType, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: VendorStatus.APPROVED,
      isActive: true,
      deletedAt: null,
    };

    // auto-expire sponsorships
    await this.prisma.vendor.updateMany({
      where: { isSponsored: true, sponsoredUntil: { lt: new Date() } },
      data: { isSponsored: false, sponsoredUntil: null, sponsorTier: null },
    });

    if (category) where.category = { slug: category };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (bookingType) where.bookingType = bookingType;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isSponsored: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, businessName: true, slug: true, description: true,
          logo: true, coverImage: true, city: true, state: true, country: true,
          bookingType: true, isFeatured: true, isVerified: true,
          isSponsored: true, sponsorTier: true,
          category: { select: { id: true, name: true, slug: true, icon: true } },
          _count: { select: { services: true, reviews: true } },
          reviews: { select: { rating: true }, where: { isVisible: true } },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    const vendorsWithRating = vendors.map(v => {
      const ratings = (v.reviews as { rating: number }[]);
      const avgRating = ratings.length
        ? Number((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1))
        : 0;
      const { reviews: _, ...rest } = v;
      return { ...rest, avgRating };
    });

    return {
      data: vendorsWithRating,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Public: Get Vendor by ID ──────────────────────────────────────────────

  async findById(id: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, status: VendorStatus.APPROVED, isActive: true, deletedAt: null },
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true } },
        services: {
          where: { isActive: true, isEnabled: true, deletedAt: null },
          select: { id: true, name: true, description: true, price: true, duration: true },
          orderBy: { createdAt: 'asc' },
        },
        businessHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { reviews: true, bookings: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  // ─── Public: Get Vendors by Category ──────────────────────────────────────

  async findByCategory(slug: string, query: VendorQueryDto) {
    return this.findAll({ ...query, category: slug });
  }

  // ─── Admin: List All Vendors ───────────────────────────────────────────────

  async adminFindAll(status?: VendorStatus, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status) where.status = status;

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { services: true, bookings: true } },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Admin: Approve ────────────────────────────────────────────────────────

  async approve(adminId: number, vendorId: number, dto: AdminVendorActionDto) {
    const vendor = await this.findVendorOrThrow(vendorId);
    if (vendor.status === VendorStatus.APPROVED) throw new ConflictException('Vendor is already approved');

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.APPROVED },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.APPROVE, dto.reason);

    this.notifications.send({
      userId: vendor.userId,
      type: NotificationType.VENDOR_APPROVED,
      title: 'Vendor Approved',
      message: 'Your vendor profile has been approved! You can now accept bookings.',
      metadata: { vendorId },
    });

    return updated;
  }

  // ─── Admin: Suspend ────────────────────────────────────────────────────────

  async suspend(adminId: number, vendorId: number, dto: AdminVendorActionDto) {
    const vendor = await this.findVendorOrThrow(vendorId);

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.SUSPENDED },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.SUSPEND, dto.reason);

    this.notifications.send({
      userId: vendor.userId,
      type: NotificationType.VENDOR_SUSPENDED,
      title: 'Vendor Suspended',
      message: 'Your vendor profile has been suspended. Contact support for details.',
      metadata: { vendorId },
    });

    return updated;
  }

  // ─── Admin: Block ──────────────────────────────────────────────────────────

  async block(adminId: number, vendorId: number, dto: AdminVendorActionDto) {
    await this.findVendorOrThrow(vendorId);

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.BLOCKED },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.BLOCK, dto.reason);
    return updated;
  }

  // ─── Admin: Unblock ───────────────────────────────────────────────────────

  async unblock(adminId: number, vendorId: number, dto: AdminVendorActionDto) {
    await this.findVendorOrThrow(vendorId);

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { status: VendorStatus.APPROVED },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.UNBLOCK, dto.reason);
    return updated;
  }

  // ─── Admin: Sponsor ───────────────────────────────────────────────────────

  async sponsor(adminId: number, vendorId: number, tier: string, durationDays: number) {
    await this.findVendorOrThrow(vendorId);
    const sponsoredUntil = new Date();
    sponsoredUntil.setDate(sponsoredUntil.getDate() + durationDays);

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { isSponsored: true, sponsoredUntil, sponsorTier: tier as any },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.SPONSOR);
    return updated;
  }

  // ─── Admin: Unsponsor ──────────────────────────────────────────────────────

  async unsponsor(adminId: number, vendorId: number) {
    await this.findVendorOrThrow(vendorId);

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { isSponsored: false, sponsoredUntil: null, sponsorTier: null },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.UNSPONSOR);
    return updated;
  }

  // ─── Admin: Delete ─────────────────────────────────────────────────────────

  async remove(adminId: number, vendorId: number) {
    await this.findVendorOrThrow(vendorId);

    const deleted = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { deletedAt: new Date() },
    });

    await this.logAdminAction(adminId, vendorId, AdminActionType.DELETE);
    return deleted;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async findVendorOrThrow(id: number) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, deletedAt: null } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  private async generateSlug(businessName: string): Promise<string> {
    const base = slugify(businessName, { lower: true, strict: true });
    let slug = base;
    let count = 1;
    while (await this.prisma.vendor.findUnique({ where: { slug } })) {
      slug = `${base}-${count++}`;
    }
    return slug;
  }

  private logAdminAction(adminId: number, vendorId: number, action: AdminActionType, reason?: string) {
    return this.prisma.adminAction.create({
      data: { adminId, targetId: vendorId, targetType: AdminTargetType.VENDOR, action, reason },
    });
  }
}
