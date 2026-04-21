import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateShopDto, UpdateShopDto } from '../dto/shop.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateShopDto, ownerId: number) {
    return this.prisma.shop.create({ data: { ...dto, ownerId } });
  }

  findAll() {
    return this.prisma.shop.findMany({
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
  }

  async findById(id: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async update(id: number, ownerId: number, dto: UpdateShopDto) {
    const shop = await this.findById(id);
    if (shop.ownerId !== ownerId) throw new ForbiddenException('Not authorized to update this shop');
    return this.prisma.shop.update({ where: { id }, data: dto });
  }
}
