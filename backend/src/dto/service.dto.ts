import { IsNumber, IsString } from 'class-validator';

export class CreateServiceDto {
  @IsNumber()
  shopId!: number;

  @IsString()
  name!: string;

  @IsNumber()
  duration!: number;

  @IsNumber()
  price!: number;
}
