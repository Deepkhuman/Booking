import { Module } from '@nestjs/common';
import { ReviewController } from '../controllers/review.controller';
import { ReviewService } from '../services/review.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityModule } from './security.module';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
