import {
  IsString, IsOptional, IsEnum, IsEmail, IsUrl,
  IsNumber, Min, Max, IsBoolean, IsNotEmpty,
} from 'class-validator';
import { BookingType } from '@prisma/client';
import { Type } from 'class-transformer';

export class RegisterVendorDto {
  @IsNotEmpty()
  @IsString()
  businessName!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  categoryId!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminVendorActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VendorQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;

  @IsOptional()
  @IsString()
  search?: string;
}
