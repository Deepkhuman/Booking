import { Module } from '@nestjs/common';
import { VendorController, AdminVendorController } from '../controllers/vendor.controller';
import { VendorService } from '../services/vendor.service';
import { EmailService } from '../services/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';
import { SecurityModule } from './security.module';

@Module({
  imports: [PrismaModule, NotificationModule, SecurityModule],
  controllers: [VendorController, AdminVendorController],
  providers: [VendorService, EmailService],
  exports: [VendorService],
})
export class VendorModule {}
