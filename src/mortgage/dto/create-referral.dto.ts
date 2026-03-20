import { IsMongoId, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateReferralDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  bankPartnerId: string;

  @IsOptional()
  @IsMongoId()
  propertyId?: string;

  @IsNumber()
  propertyValue: number;

  @IsNumber()
  income: number;

  @IsNumber()
  loanAmount: number;
}
