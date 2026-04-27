import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto, VendorReplyDto } from '../dto/review.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(user.id, dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllReviews(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reviewService.adminGetAll(Number(page), Number(limit));
  }

  @Get('vendor/:vendorId')
  getVendorReviews(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewService.getVendorReviews(vendorId, Number(page), Number(limit));
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyReviews(@CurrentUser() user: any) {
    return this.reviewService.getMyReviews(user.id);
  }

  @Get('can-review/:bookingId')
  @UseGuards(JwtAuthGuard)
  canReview(@CurrentUser() user: any, @Param('bookingId', ParseIntPipe) bookingId: number) {
    return this.reviewService.canReview(user.id, bookingId);
  }

  @Put(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDOR')
  reply(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: VendorReplyDto) {
    return this.reviewService.vendorReply(user.id, id, dto);
  }

  @Put(':id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  hide(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.reviewService.adminHide(user.id, id);
  }

  @Put(':id/show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  show(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.reviewService.adminShow(user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  delete(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.reviewService.adminDelete(user.id, id);
  }
}
