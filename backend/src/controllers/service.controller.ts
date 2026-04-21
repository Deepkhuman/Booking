import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CreateServiceDto } from '../dto/service.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ServiceService } from '../services/service.service';
import { JwtPayload } from '../strategies/jwt.strategy';

@Controller('services')
export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  @Get('shop/:shopId')
  findByShop(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.serviceService.findByShop(shopId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: JwtPayload) {
    return this.serviceService.create(dto, user.id);
  }
}
