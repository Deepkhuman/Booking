import { Module } from '@nestjs/common';
import { ServiceController, AdminServiceController } from '../controllers/service.controller';
import { ServiceService } from '../services/service.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceController, AdminServiceController],
  providers: [ServiceService, CloudinaryService],
  exports: [CloudinaryService],
})
export class ServiceModule {}
