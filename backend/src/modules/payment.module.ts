import { Module } from '@nestjs/common';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
