import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { VendorService } from '../services/vendor.service';
import { RegisterVendorDto, UpdateVendorDto, AdminVendorActionDto, VendorQueryDto } from '../dto/vendor.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role, VendorStatus } from '@prisma/client';
import { JwtPayload } from '../strategies/jwt.strategy';

// ─── Public + Vendor Routes ────────────────────────────────────────────────

@Controller('vendors')
export class VendorController {
  constructor(private vendorService: VendorService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterVendorDto) {
    return this.vendorService.register(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.vendorService.getMyProfile(user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateVendorDto) {
    return this.vendorService.updateMyProfile(user.id, dto);
  }

  @Get()
  findAll(@Query() query: VendorQueryDto) {
    return this.vendorService.findAll(query);
  }

  @Get('category/:slug')
  findByCategory(@Param('slug') slug: string, @Query() query: VendorQueryDto) {
    return this.vendorService.findByCategory(slug, query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.vendorService.findById(id);
  }
}

// ─── Admin Routes ──────────────────────────────────────────────────────────

@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminVendorController {
  constructor(private vendorService: VendorService) {}

  @Get()
  findAll(
    @Query('status') status?: VendorStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.vendorService.adminFindAll(status, Number(page), Number(limit));
  }

  @Put(':id/approve')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminVendorActionDto,
  ) {
    return this.vendorService.approve(user.id, id, dto);
  }

  @Put(':id/suspend')
  suspend(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminVendorActionDto,
  ) {
    return this.vendorService.suspend(user.id, id, dto);
  }

  @Put(':id/block')
  block(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminVendorActionDto,
  ) {
    return this.vendorService.block(user.id, id, dto);
  }

  @Put(':id/unblock')
  unblock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminVendorActionDto,
  ) {
    return this.vendorService.unblock(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.vendorService.remove(user.id, id);
  }

  @Put(':id/sponsor')
  sponsor(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { tier: string; durationDays: number },
  ) {
    return this.vendorService.sponsor(user.id, id, dto.tier, dto.durationDays);
  }

  @Put(':id/unsponsor')
  unsponsor(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.vendorService.unsponsor(user.id, id);
  }
}
