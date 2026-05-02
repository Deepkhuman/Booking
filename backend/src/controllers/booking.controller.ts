import {
  Body, Controller, Get, Param, ParseIntPipe,
  Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto, SetBusinessHoursDto } from '../dto/booking.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role, BookingStatus } from '@prisma/client';
import { JwtPayload } from '../strategies/jwt.strategy';
import { SecurityService } from '../services/security.service';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private security: SecurityService,
  ) {}

  // ─── Customer ──────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBookingDto) {
    const result = await this.bookingService.create(user.id, dto);
    this.security.onBookingCreated(user.id).catch(() => {});
    return result;
  }

  @Get('mine')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  getMyBookings(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.bookingService.getMyBookings(user.id, Number(page), Number(limit));
  }

  // ─── Vendor ────────────────────────────────────────────────────────────────

  @Get('vendor')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR)
  getVendorBookings(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingService.getVendorBookings(user.id, Number(page), Number(limit), status);
  }

  @Put(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR)
  confirm(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.confirm(user.id, id);
  }

  @Put(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR)
  complete(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.complete(user.id, id);
  }

  // ─── Customer or Vendor ────────────────────────────────────────────────────

  @Put(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.bookingService.cancel(user.id, id, user.role);
  }

  // ─── Public ────────────────────────────────────────────────────────────────

  @Get('availability/:vendorId')
  getAvailability(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Query('date') date: string,
  ) {
    if (!date) throw new Error('date query param is required');
    return this.bookingService.getAvailability(vendorId, date);
  }

  // ─── Business Hours (vendor) ───────────────────────────────────────────────

  @Post('business-hours')
  @UseGuards(RolesGuard)
  @Roles(Role.VENDOR)
  setBusinessHours(@CurrentUser() user: JwtPayload, @Body() dto: SetBusinessHoursDto) {
    return this.bookingService.setBusinessHours(user.id, dto);
  }

  @Get('business-hours/:vendorId')
  getBusinessHours(@Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.bookingService.getBusinessHours(vendorId);
  }
}
