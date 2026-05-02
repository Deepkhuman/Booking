import { Module } from '@nestjs/common';
import { CronService } from '../services/cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [CronService],
})
export class CronModule {}
