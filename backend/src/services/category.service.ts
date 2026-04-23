import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

const generateSlug = (name: string) =>
  name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = generateSlug(dto.name);

    const exists = await this.prisma.category.findUnique({ where: { slug } });
    if (exists) throw new BadRequestException('Category with this name already exists');

    return this.prisma.category.create({
      data: { name: dto.name, slug, icon: dto.icon, description: dto.description },
    });
  }

  findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) throw new NotFoundException('Category not found');

    const data: any = { ...dto };
    if (dto.name) data.slug = generateSlug(dto.name);

    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) throw new NotFoundException('Category not found');

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Category deleted successfully' };
  }
}
