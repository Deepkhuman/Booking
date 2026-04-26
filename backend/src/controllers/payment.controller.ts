import {
  Body, Controller, Get, Param, ParseIntPipe,
  Post, Query, UseGuards,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentIntentDto, VerifyPaymentDto, RefundPaymentDto } from '../dto/payment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';
import { Role } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create-order')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  createOrder(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createOrder(user.id, dto);
  }

  @Post('verify')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  verifyPayment(@CurrentUser() user: JwtPayload, @Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(user.id, dto);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getHistory(user.id, Number(page), Number(limit));
  }

  @Post('refund/:bookingId')
  refund(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentService.refund(user.id, bookingId, dto, user.role === Role.ADMIN);
  }
}
