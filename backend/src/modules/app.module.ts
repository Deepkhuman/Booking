import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth.module';
import { BookingModule } from './booking.module';
import { ServiceModule } from './service.module';
import { ShopModule } from './shop.module';
import { AppController } from '../controllers/app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ShopModule,
    ServiceModule,
    BookingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
