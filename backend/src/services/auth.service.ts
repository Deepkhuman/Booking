import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ForgotPasswordDto, LoginDto, RefreshTokenDto, RegisterDto, ResetPasswordDto } from '../dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  private generateAccessToken(id: number, role: Role) {
    return this.jwt.sign({ id, role }, { expiresIn: '15m' });
  }

  private generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  private validatePasswordComplexity(password: string) {
    if (!/[A-Z]/.test(password)) throw new BadRequestException('Password must contain at least one uppercase letter');
    if (!/[0-9]/.test(password)) throw new BadRequestException('Password must contain at least one number');
    if (!/[!@#$%^&*]/.test(password)) throw new BadRequestException('Password must contain at least one special character (!@#$%^&*)');
  }

  private async createTokenPair(userId: number, role: Role) {
    const refreshToken = this.generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken: this.generateAccessToken(userId, role), refreshToken };
  }

  async register(dto: RegisterDto) {
    this.validatePasswordComplexity(dto.password);

    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('User already exists');

    const password = await bcrypt.hash(dto.password, 10);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: { email: dto.email, password, name: dto.name, role: dto.role ?? Role.CUSTOMER, emailVerifyToken },
    });

    await this.emailService.sendVerificationEmail(user.email, emailVerifyToken);
    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minute(s)`);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password ?? '');

    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      if (shouldLock) throw new UnauthorizedException('Too many failed attempts. Account locked for 15 minutes');
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) throw new UnauthorizedException('Please verify your email before logging in');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokens = await this.createTokenPair(user.id, user.role);
    return { id: user.id, name: user.name, email: user.email, role: user.role, ...tokens };
  }

  async socialLogin(profile: { googleId?: string; facebookId?: string; name: string; email: string; avatar?: string }) {
    const { googleId, facebookId, email, name, avatar } = profile;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name, avatar, googleId, facebookId, isEmailVerified: true, role: Role.CUSTOMER },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleId ?? user.googleId,
          facebookId: facebookId ?? user.facebookId,
          avatar: user.avatar ?? avatar,
          isEmailVerified: true,
        },
      });
    }

    const tokens = await this.createTokenPair(user.id, user.role);
    return { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, ...tokens };
  }

  async refresh(dto: RefreshTokenDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.createTokenPair(stored.user.id, stored.user.role);
    return tokens;
  }

  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.deleteMany({ where: { token: dto.refreshToken } });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.validatePasswordComplexity(dto.password);

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const password = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password, passwordResetToken: null, passwordResetExpiry: null },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }
}
