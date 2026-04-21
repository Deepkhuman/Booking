import { Module } from '@nestjs/common';
import { BookingController } from '../controllers/booking.controller';
import { BookingService } from '../services/booking.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
