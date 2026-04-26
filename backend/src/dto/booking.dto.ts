import {
  IsEnum, IsInt, IsOptional, IsString,
  IsDateString, IsPositive, ValidateIf, IsArray, ValidateNested, IsBoolean,
} from 'class-validator';
import { BookingType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsInt()
  @IsPositive()
  vendorId!: number;

  @IsInt()
  @IsPositive()
  serviceId!: number;

  @IsEnum(BookingType)
  bookingType!: BookingType;

  // SLOT_BASED & HOURLY
  @ValidateIf((o) => o.bookingType === BookingType.SLOT_BASED || o.bookingType === BookingType.HOURLY)
  @IsString()
  date?: string;

  @ValidateIf((o) => o.bookingType === BookingType.SLOT_BASED || o.bookingType === BookingType.HOURLY)
  @IsString()
  startTime?: string;

  @ValidateIf((o) => o.bookingType === BookingType.HOURLY)
  @IsString()
  endTime?: string;

  // DAILY
  @ValidateIf((o) => o.bookingType === BookingType.DAILY)
  @IsDateString()
  checkIn?: string;

  @ValidateIf((o) => o.bookingType === BookingType.DAILY)
  @IsDateString()
  checkOut?: string;

  // NO_BOOKING
  @ValidateIf((o) => o.bookingType === BookingType.NO_BOOKING)
  @IsInt()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BusinessHoursScheduleDto {
  @IsInt()
  dayOfWeek!: number; // 0 = Sunday, 6 = Saturday

  @IsString()
  openTime!: string; // "09:00"

  @IsString()
  closeTime!: string; // "18:00"

  @IsOptional()
  @IsInt()
  @IsPositive()
  slotDuration?: number; // minutes, for SLOT_BASED

  @IsBoolean()
  isClosed!: boolean;
}

export class SetBusinessHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursScheduleDto)
  schedules!: BusinessHoursScheduleDto[];
}
