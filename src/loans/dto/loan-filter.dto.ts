import { IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class LoanFilterDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
