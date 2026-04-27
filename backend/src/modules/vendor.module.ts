import { Module } from '@nestjs/common';
import { VendorController, AdminVendorController } from '../controllers/vendor.controller';
import { VendorService } from '../services/vendor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [VendorController, AdminVendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
