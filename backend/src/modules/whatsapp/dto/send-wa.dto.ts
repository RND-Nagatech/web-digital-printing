import { IsString } from 'class-validator';
export class SendWaDto { @IsString() to!: string; @IsString() message!: string; }
