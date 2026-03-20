import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsMongoId()
  propertyId?: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsNumber()
  termMonths: number;

  @IsNumber()
  interestRate: number;

  @IsOptional()
  escrowLinked?: boolean;
}
