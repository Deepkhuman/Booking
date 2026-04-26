import { Module } from '@nestjs/common';
import { BookingController } from '../controllers/booking.controller';
import { BookingService } from '../services/booking.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
