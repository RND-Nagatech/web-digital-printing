import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterCustomerDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(3)
    @MaxLength(40)
    username!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(100)
    password!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    nama!: string;

    @IsString()
    @MinLength(3)
    @MaxLength(300)
    alamat!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(20)
    no_hp!: string;
}