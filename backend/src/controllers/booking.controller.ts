import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateBookingDto, SetBusinessHoursDto, UpdateBookingStatusDto } from '../dto/booking.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BookingService } from '../services/booking.service';
import { JwtPayload } from '../strategies/jwt.strategy';

@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get('availability/:shopId')
  getAvailability(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('date') date: string,
    @Query('serviceId', ParseIntPipe) serviceId: number,
  ) {
    return this.bookingService.getAvailability(shopId, date, serviceId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyBookings(@CurrentUser() user: JwtPayload) {
    return this.bookingService.getCustomerBookings(user.id);
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard)
  getShopBookings(@Param('shopId', ParseIntPipe) shopId: number, @CurrentUser() user: JwtPayload) {
    return this.bookingService.getShopBookings(shopId, user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createBooking(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingService.createBooking(user.id, dto);
  }

  @Post('hours/:shopId')
  @UseGuards(JwtAuthGuard)
  setBusinessHours(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() dto: SetBusinessHoursDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingService.setBusinessHours(shopId, user.id, dto);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingService.updateBookingStatus(id, user.id, dto);
  }
}
