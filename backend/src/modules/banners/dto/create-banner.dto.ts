import { IsMongoId, IsOptional, IsString } from 'class-validator';
export class CreateBannerDto {
  @IsMongoId()
  material_id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
