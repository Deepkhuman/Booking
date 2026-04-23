import { Module } from '@nestjs/common';
import { VendorController, AdminVendorController } from '../controllers/vendor.controller';
import { VendorService } from '../services/vendor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorController, AdminVendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
