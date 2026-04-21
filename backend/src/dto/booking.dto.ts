import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class ScheduleDto {
  @IsNumber()
  dayOfWeek!: number;

  @IsString()
  openTime!: string;

  @IsString()
  closeTime!: string;
}

export class SetBusinessHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules!: ScheduleDto[];
}

export class CreateBookingDto {
  @IsNumber()
  shopId!: number;

  @IsNumber()
  serviceId!: number;

  @IsString()
  date!: string;

  @IsString()
  startTime!: string;
}

export class UpdateBookingStatusDto {
  @IsString()
  status!: string;
}
