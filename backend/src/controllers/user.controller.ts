import {
  Body, Controller, Get, Put, Post,
  UseGuards, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatar?: string;
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true, phone: true,
        avatar: true, role: true, isEmailVerified: true,
        createdAt: true, googleId: true, facebookId: true,
      },
    });
  }

  @Put('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
    });
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const { url } = await this.cloudinary.uploadImage(file, 'avatars');
    return this.prisma.user.update({
      where: { id: user.id },
      data: { avatar: url },
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
    });
  }

  @Put('me/password')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.password) throw new BadRequestException('Password change not available for social login accounts');

    const valid = await bcrypt.compare(dto.currentPassword, dbUser.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    // enforce complexity
    if (!/[A-Z]/.test(dto.newPassword)) throw new BadRequestException('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(dto.newPassword)) throw new BadRequestException('Password must contain at least one number');
    if (!/[!@#$%^&*]/.test(dto.newPassword)) throw new BadRequestException('Password must contain at least one special character');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    // invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Password changed successfully. Please log in again.' };
  }
}
