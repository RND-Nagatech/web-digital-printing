import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

export class CreateCartItemDto {
    @IsString() kode_bahan!: string;
    @Type(() => Number) @IsNumber() @Min(0.1) panjang!: number;
    @Type(() => Number) @IsNumber() @Min(0.1) lebar!: number;
    @Type(() => Number) @IsNumber() @Min(1) quantity!: number;
    @IsOptional() @IsString() mata_ayam?: string;
    @IsOptional() @IsString() nama_bahan?: string;
    @IsOptional() @IsString() gambar_bahan?: string;
    @IsOptional() @IsString() design_file?: string;
}

export class CreateCartDto {
    @IsOptional() @IsString() nama_customer?: string;
    @IsOptional() @IsString() no_hp?: string;
    @IsOptional() @IsString() alamat?: string;

    @Transform(({ value }) => {
        const normalizeItem = (raw: any) => {
            if (!raw || typeof raw !== 'object') return raw;
            return {
                kode_bahan: raw.kode_bahan ?? raw.materialId ?? raw.material_id,
                panjang: raw.panjang ?? raw.length,
                lebar: raw.lebar ?? raw.width,
                quantity: raw.quantity ?? raw.qty,
                mata_ayam: raw.mata_ayam ?? raw.mataAyamLabel ?? raw.eyelet,
                nama_bahan: raw.nama_bahan ?? raw.materialName ?? raw.material_name,
                gambar_bahan: raw.gambar_bahan ?? raw.materialImage ?? raw.material_image ?? raw.imageUrl,
                design_file: raw.design_file ?? raw.designFile,
            };
        };

        const toInstances = (input: unknown) => {
            if (!Array.isArray(input)) return input;
            return input.map((item) => plainToInstance(CreateCartItemDto, normalizeItem(item)));
        };

        if (typeof value === 'string') {
            try {
                return toInstances(JSON.parse(value));
            } catch {
                return value;
            }
        }

        return toInstances(value);
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateCartItemDto)
    items!: CreateCartItemDto[];

    @Transform(({ value }) => (value === '' || value === undefined ? 'pay_later' : value))
    @IsIn(['pay_now', 'dp', 'pay_later'])
    payment_method!: 'pay_now' | 'dp' | 'pay_later';

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    dp_amount?: number;

    @IsOptional() @IsString() @MaxLength(500) notes?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    estimated_total?: number;
}
