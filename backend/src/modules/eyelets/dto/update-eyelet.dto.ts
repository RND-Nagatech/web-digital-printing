import { PartialType } from '@nestjs/mapped-types';
import { CreateEyeletDto } from './create-eyelet.dto';
export class UpdateEyeletDto extends PartialType(CreateEyeletDto) {}
