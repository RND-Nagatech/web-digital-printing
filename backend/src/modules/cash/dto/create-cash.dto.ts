import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
export class CreateCashDto {
  @IsEnum(['PEMASUKAN', 'PENGELUARAN']) type!: 'PEMASUKAN' | 'PENGELUARAN';
  @IsNumber() @Min(0) jumlah!: number;
  @IsString() deskripsi!: string;
}
