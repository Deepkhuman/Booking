import { IsInt, IsPositive, IsString, IsOptional } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsInt()
  @IsPositive()
  bookingId!: number;
}

export class VerifyPaymentDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;

  @IsInt()
  @IsPositive()
  bookingId!: number;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
