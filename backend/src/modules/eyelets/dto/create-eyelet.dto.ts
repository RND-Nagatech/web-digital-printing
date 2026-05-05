import { IsString } from 'class-validator';
export class CreateEyeletDto { @IsString() name!: string; }
