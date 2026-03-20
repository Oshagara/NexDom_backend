import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateClaimDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  policyId: string;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  evidenceFiles?: string[];
}
