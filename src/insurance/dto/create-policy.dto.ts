import { IsMongoId, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreatePolicyDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  productId: string;

  @IsNumber()
  premium: number;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;
}
