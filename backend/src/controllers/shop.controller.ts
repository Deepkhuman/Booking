import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CreateShopDto, UpdateShopDto } from '../dto/shop.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ShopService } from '../services/shop.service';
import { JwtPayload } from '../strategies/jwt.strategy';

@Controller('shops')
export class ShopController {
  constructor(private shopService: ShopService) {}

  @Get()
  findAll() {
    return this.shopService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shopService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  create(@Body() dto: CreateShopDto, @CurrentUser() user: JwtPayload) {
    return this.shopService.create(dto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShopDto, @CurrentUser() user: JwtPayload) {
    return this.shopService.update(id, user.id, dto);
  }
}
