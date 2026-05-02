import { Module } from '@nestjs/common';
import { SecurityService } from '../services/security.service';
import { AlertService } from '../services/alert.service';
import { EmailService } from '../services/email.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [SecurityService, AlertService, EmailService],
  exports: [SecurityService, AlertService],
})
export class SecurityModule {}
