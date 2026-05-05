import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() price_per_meter!: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
