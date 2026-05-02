import { Module } from '@nestjs/common';
import { CronService } from '../services/cron.service';
import { EmailService } from '../services/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';
import { SecurityModule } from './security.module';

@Module({
  imports: [PrismaModule, NotificationModule, SecurityModule],
  providers: [CronService, EmailService],
})
export class CronModule {}
