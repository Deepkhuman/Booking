import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { CloudinaryService } from '../services/cloudinary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [CloudinaryService],
})
export class UserModule {}
