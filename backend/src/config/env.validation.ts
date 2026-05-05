import { IsBooleanString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class EnvValidation {
  @IsNumberString()
  PORT!: string;

  @IsString()
  MONGODB_URI!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN!: string;

  @IsNumberString()
  BCRYPT_ROUNDS!: string;

  @IsNumberString()
  UPLOAD_MAX_SIZE!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsBooleanString()
  WHATSAPP_ENABLED?: string;

  @IsOptional()
  @IsString()
  WHATSAPP_ADMIN_NUMBER?: string;
}
