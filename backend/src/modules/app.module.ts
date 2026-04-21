import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth.module';
import { BookingModule } from './booking.module';
import { ServiceModule } from './service.module';
import { ShopModule } from './shop.module';
import { AppController } from '../controllers/app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    PrismaModule,
    AuthModule,
    ShopModule,
    ServiceModule,
    BookingModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
