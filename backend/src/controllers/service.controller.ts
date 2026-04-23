import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Put, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ServiceService } from '../services/service.service';
import { CreateServiceDto, UpdateServiceDto } from '../dto/service.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { JwtPayload } from '../strategies/jwt.strategy';

// ─── Vendor + Public Routes ────────────────────────────────────────────────

@Controller('services')
export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceDto) {
    return this.serviceService.create(user.id, dto);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.serviceService.findByVendor(vendorId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.serviceService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.serviceService.remove(user.id, id);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  uploadImages(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.serviceService.uploadImages(user.id, id, files);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  deleteImage(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.serviceService.deleteImage(user.id, id, imageId);
  }
}

// ─── Admin Routes ──────────────────────────────────────────────────────────

@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminServiceController {
  constructor(private serviceService: ServiceService) {}

  @Put(':id/enable')
  enable(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.serviceService.adminEnable(user.id, id);
  }

  @Put(':id/disable')
  disable(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.serviceService.adminDisable(user.id, id);
  }
}
