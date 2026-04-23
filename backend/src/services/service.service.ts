import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateServiceDto, UpdateServiceDto } from '../dto/service.dto';
import { AdminActionType, AdminTargetType } from '@prisma/client';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ─── Create Service ────────────────────────────────────────────────────────

  async create(userId: number, dto: CreateServiceDto) {
    const vendor = await this.getApprovedVendorOrThrow(userId);
    return this.prisma.vendorService.create({
      data: { vendorId: vendor.id, ...dto },
      include: { images: true },
    });
  }

  // ─── Get Services by Vendor (public) ──────────────────────────────────────

  async findByVendor(vendorId: number) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.vendorService.findMany({
      where: { vendorId, isActive: true, isEnabled: true, deletedAt: null },
      include: { images: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Update Service ────────────────────────────────────────────────────────

  async update(userId: number, serviceId: number, dto: UpdateServiceDto) {
    const service = await this.getOwnServiceOrThrow(userId, serviceId);
    return this.prisma.vendorService.update({
      where: { id: service.id },
      data: dto,
      include: { images: true },
    });
  }

  // ─── Delete Service ────────────────────────────────────────────────────────

  async remove(userId: number, serviceId: number) {
    const service = await this.getOwnServiceOrThrow(userId, serviceId);

    // soft delete all images from cloudinary
    const images = await this.prisma.serviceImage.findMany({ where: { serviceId: service.id } });
    await Promise.all(images.map((img) => this.cloudinary.deleteImage(img.publicId)));

    return this.prisma.vendorService.update({
      where: { id: service.id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Upload Images ─────────────────────────────────────────────────────────

  async uploadImages(userId: number, serviceId: number, files: Express.Multer.File[]) {
    const service = await this.getOwnServiceOrThrow(userId, serviceId);

    const existing = await this.prisma.serviceImage.count({ where: { serviceId: service.id } });
    if (existing + files.length > 5) {
      throw new BadRequestException('Maximum 5 images per service');
    }

    const uploaded = await Promise.all(
      files.map((file) => this.cloudinary.uploadImage(file, 'services')),
    );

    const images = await Promise.all(
      uploaded.map(({ url, publicId }) =>
        this.prisma.serviceImage.create({ data: { serviceId: service.id, url, publicId } }),
      ),
    );

    return images;
  }

  // ─── Delete Image ──────────────────────────────────────────────────────────

  async deleteImage(userId: number, serviceId: number, imageId: number) {
    await this.getOwnServiceOrThrow(userId, serviceId);

    const image = await this.prisma.serviceImage.findFirst({
      where: { id: imageId, serviceId },
    });
    if (!image) throw new NotFoundException('Image not found');

    await this.cloudinary.deleteImage(image.publicId);
    return this.prisma.serviceImage.delete({ where: { id: imageId } });
  }

  // ─── Admin: Enable / Disable ───────────────────────────────────────────────

  async adminEnable(adminId: number, serviceId: number) {
    return this.adminToggle(adminId, serviceId, true);
  }

  async adminDisable(adminId: number, serviceId: number) {
    return this.adminToggle(adminId, serviceId, false);
  }

  private async adminToggle(adminId: number, serviceId: number, isEnabled: boolean) {
    const service = await this.prisma.vendorService.findFirst({
      where: { id: serviceId, deletedAt: null },
    });
    if (!service) throw new NotFoundException('Service not found');

    const updated = await this.prisma.vendorService.update({
      where: { id: serviceId },
      data: { isEnabled },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        targetId: serviceId,
        targetType: AdminTargetType.SERVICE,
        action: isEnabled ? AdminActionType.ENABLE_SERVICE : AdminActionType.DISABLE_SERVICE,
      },
    });

    return updated;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getApprovedVendorOrThrow(userId: number) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    if (vendor.status !== 'APPROVED') throw new ForbiddenException('Your vendor account is not approved yet');
    return vendor;
  }

  private async getOwnServiceOrThrow(userId: number, serviceId: number) {
    const vendor = await this.getApprovedVendorOrThrow(userId);
    const service = await this.prisma.vendorService.findFirst({
      where: { id: serviceId, vendorId: vendor.id, deletedAt: null },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }
}
