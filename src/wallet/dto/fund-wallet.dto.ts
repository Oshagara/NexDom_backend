import { IsNumber, Min } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

