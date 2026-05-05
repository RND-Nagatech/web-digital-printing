import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginCustomerDto {
    @IsString()
    @MinLength(3)
    @MaxLength(120)
    emailOrUsername!: string;

    @IsString()
    @MinLength(6)
    @MaxLength(100)
    password!: string;
}