import { ArrayMinSize, IsArray, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCartItemDto } from './create-cart.dto';

export class UpdateCartDto {
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateCartItemDto)
    items?: CreateCartItemDto[];

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    estimated_total?: number;
}
