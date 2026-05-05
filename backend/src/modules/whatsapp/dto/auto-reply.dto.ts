import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class AutoReplyDto {
  @IsString()
  keyword!: string;

  @IsString()
  reply!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsIn(['exact', 'contains'])
  matchType?: 'exact' | 'contains';
}
