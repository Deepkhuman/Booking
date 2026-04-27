import { Module } from '@nestjs/common';
import { BookingController } from '../controllers/booking.controller';
import { BookingService } from '../services/booking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
