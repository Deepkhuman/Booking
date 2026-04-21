import { IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(32, { message: 'Password must be at most 32 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*]/, { message: 'Password must contain at least one special character (!@#$%^&*)' })
  password!: string;

  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be CUSTOMER or OWNER' })
  role?: Role;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(32, { message: 'Password must be at most 32 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*]/, { message: 'Password must contain at least one special character (!@#$%^&*)' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
