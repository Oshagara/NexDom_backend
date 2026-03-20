import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyStatus } from '../property.schema';

export class PropertyFilterDto {
  @IsOptional()
  @IsEnum(['verified', 'pending', 'flagged'])
  status?: PropertyStatus;

  @IsOptional()
  type?: string;

  @IsOptional()
  landlordId?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
