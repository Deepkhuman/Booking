import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  getMenuForRole(role: Role) {
    return this.prisma.menuItem.findMany({
      where: {
        isActive: true,
        roles: { has: role },
      },
      orderBy: { order: 'asc' },
      select: { id: true, label: true, icon: true, path: true, order: true },
    });
  }
}
