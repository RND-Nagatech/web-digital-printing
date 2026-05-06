import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSizeDto {
  @IsString() kode_ukuran!: string;
  @IsString() nama_ukuran!: string;
  @IsOptional() @IsString() deskripsi?: string;
  @IsOptional() @IsString() satuan?: 'CM' | 'M';
  @IsNumber() @Min(0.1) panjang_cm!: number;
  @IsNumber() @Min(0.1) lebar_cm!: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
