import { Module } from '@nestjs/common';
import { BookingController } from '../controllers/booking.controller';
import { BookingService } from '../services/booking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';
import { SecurityModule } from './security.module';

@Module({
  imports: [PrismaModule, NotificationModule, SecurityModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
