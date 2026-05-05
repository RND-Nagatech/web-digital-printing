import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsString() kode_bahan!: string;
  @Type(() => Number) @IsNumber() @Min(0.1) panjang!: number;
  @Type(() => Number) @IsNumber() @Min(0.1) lebar!: number;
  @IsOptional() @IsString() mata_ayam?: string;
  @Type(() => Number) @IsNumber() @Min(1) quantity!: number;
}

export class CreateOrderDto {
  @IsString() nama_customer!: string;
  @IsString() no_hp!: string;
  @IsString() alamat!: string;
  @IsOptional() @IsString() kode_customer?: string;

  @IsOptional() @IsString() kode_bahan?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) panjang?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) lebar?: number;
  @IsOptional() @IsString() mata_ayam?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) quantity?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const normalizeItem = (raw: any) => {
      if (!raw || typeof raw !== 'object') return raw;
      return {
        kode_bahan: raw.kode_bahan ?? raw.materialId ?? raw.material_id,
        panjang: raw.panjang ?? raw.length,
        lebar: raw.lebar ?? raw.width,
        mata_ayam: raw.mata_ayam ?? raw.mataAyamLabel ?? raw.eyelet,
        quantity: raw.quantity ?? raw.qty,
      };
    };

    const toItemInstances = (input: unknown) => {
      if (!Array.isArray(input)) return input;
      return input.map((item) => plainToInstance(CreateOrderItemDto, normalizeItem(item)));
    };

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return toItemInstances(parsed);
      } catch {
        return value;
      }
    }
    return toItemInstances(value);
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsIn(['pay_now', 'dp', 'pay_later']) payment_method?: 'pay_now' | 'dp' | 'pay_later';
  @IsOptional() @IsIn(['transfer', 'cash']) payment_channel?: 'transfer' | 'cash';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) dp_amount?: number;
}
