import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class CheckoutCartDto {
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    ids?: string[];
}
