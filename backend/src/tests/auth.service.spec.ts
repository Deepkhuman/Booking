import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../services/email.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock PrismaService
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('mock_access_token') };
const mockEmail = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────
  describe('register', () => {
    const validDto = {
      name: 'John Doe',
      email: 'john@test.com',
      password: 'Password1!',
    };

    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 1, ...validDto, role: 'CUSTOMER' });

      const result = await service.register(validDto);
      expect(result.message).toContain('Registration successful');
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: validDto.email });
      await expect(service.register(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if password has no uppercase letter', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.register({ ...validDto, password: 'password1!' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if password has no number', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.register({ ...validDto, password: 'Password!' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if password has no special character', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.register({ ...validDto, password: 'Password1' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────
  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, emailVerifyToken: 'valid_token' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.verifyEmail('valid_token');
      expect(result.message).toContain('verified successfully');
    });

    it('should throw if token is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('invalid_token')).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────
  describe('login', () => {
    const hashedPassword = bcrypt.hashSync('Password1!', 10);

    const mockUser = {
      id: 1,
      email: 'john@test.com',
      password: hashedPassword,
      name: 'John',
      role: 'CUSTOMER',
      isEmailVerified: true,
      lockedUntil: null,
      failedLoginAttempts: 0,
    };

    it('should login successfully with correct credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'john@test.com', password: 'Password1!' });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.email).toBe('john@test.com');
    });

    it('should throw if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@test.com', password: 'Password1!' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({});
      await expect(service.login({ email: 'john@test.com', password: 'WrongPass1!' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if email is not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isEmailVerified: false });
      mockPrisma.user.update.mockResolvedValue({});
      await expect(service.login({ email: 'john@test.com', password: 'Password1!' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if account is locked', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      });
      await expect(service.login({ email: 'john@test.com', password: 'Password1!' })).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account after 5 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, failedLoginAttempts: 4 });
      mockPrisma.user.update.mockResolvedValue({});
      await expect(service.login({ email: 'john@test.com', password: 'WrongPass1!' })).rejects.toThrow('Too many failed attempts');
    });
  });

  // ─────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────
  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'valid_refresh',
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 1, role: 'CUSTOMER' },
        userId: 1,
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: 'valid_refresh' });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw if refresh token is expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 1,
        token: 'expired_token',
        expiresAt: new Date(Date.now() - 60000),
        user: { id: 1, role: 'CUSTOMER' },
      });
      await expect(service.refresh({ refreshToken: 'expired_token' })).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if refresh token does not exist', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: 'fake_token' })).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────
  describe('logout', () => {
    it('should logout successfully', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      const result = await service.logout({ refreshToken: 'some_token' });
      expect(result.message).toContain('Logged out');
    });
  });

  // ─────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should return same message whether email exists or not', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'nobody@test.com' });
      expect(result.message).toContain('If that email exists');
    });

    it('should send reset email if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'john@test.com' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'john@test.com' });
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('If that email exists');
    });
  });

  // ─────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid_token', password: 'NewPass1!' });
      expect(result.message).toContain('reset successfully');
    });

    it('should throw if reset token is invalid or expired', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword({ token: 'bad_token', password: 'NewPass1!' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if new password fails complexity check', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.resetPassword({ token: 'valid_token', password: 'weakpassword' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // SOCIAL LOGIN
  // ─────────────────────────────────────────
  describe('socialLogin', () => {
    const profile = { googleId: '123', name: 'John', email: 'john@gmail.com', avatar: 'https://avatar.url' };

    it('should create new user on first social login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 1, ...profile, role: 'CUSTOMER' });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.socialLogin(profile);
      expect(result.accessToken).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should link social account if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: profile.email, googleId: null, facebookId: null, avatar: null, role: 'CUSTOMER' });
      mockPrisma.user.update.mockResolvedValue({ id: 1, ...profile, role: 'CUSTOMER' });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.socialLogin(profile);
      expect(result.accessToken).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    });
  });
});
