import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryTransactionsDto {
  @IsOptional()
  @IsString()
  type?: 'fund' | 'withdraw' | 'property-payment';

  @IsOptional()
  @IsString()
  status?: 'pending' | 'successful' | 'failed';
}

