import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoreDto {
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    nama_toko!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(30)
    no_hp!: string;

    @IsString()
    @MinLength(5)
    @MaxLength(300)
    alamat!: string;
}
