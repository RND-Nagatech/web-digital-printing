import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { RoleName } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(RoleName)
  role!: RoleName;
}
