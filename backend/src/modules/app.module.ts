import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth.module';
import { BookingModule } from './booking.module';
import { CategoryModule } from './category.module';
import { MenuModule } from './menu.module';
import { ServiceModule } from './service.module';
import { VendorModule } from './vendor.module';
import { AppController } from '../controllers/app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    PrismaModule,
    AuthModule,
    CategoryModule,
    MenuModule,
    VendorModule,
    ServiceModule,
    BookingModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
