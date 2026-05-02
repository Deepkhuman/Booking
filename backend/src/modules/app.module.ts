import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth.module';
import { BookingModule } from './booking.module';
import { CategoryModule } from './category.module';
import { MenuModule } from './menu.module';
import { ServiceModule } from './service.module';
import { VendorModule } from './vendor.module';
import { PaymentModule } from './payment.module';
import { UserModule } from './user.module';
import { ReviewModule } from './review.module';
import { NotificationModule } from './notification.module';
import { AdminModule } from './admin.module';
import { CronModule } from './cron.module';
import { SecurityModule } from './security.module';
import { AppController } from '../controllers/app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CategoryModule,
    MenuModule,
    VendorModule,
    ServiceModule,
    BookingModule,
    PaymentModule,
    UserModule,
    ReviewModule,
    NotificationModule,
    AdminModule,
    CronModule,
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
