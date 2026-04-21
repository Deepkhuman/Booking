import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateServiceDto } from '../dto/service.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceDto, ownerId: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('You can only add services to your own shop');

    return this.prisma.service.create({
      data: { name: dto.name, duration: dto.duration, price: dto.price, shopId: dto.shopId },
    });
  }

  findByShop(shopId: number) {
    return this.prisma.service.findMany({ where: { shopId } });
  }
}
