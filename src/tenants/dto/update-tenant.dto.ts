import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  phone?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  landlordId?: string;

  @IsOptional()
  @Type(() => Date)
  leaseStart?: Date;

  @IsOptional()
  @Type(() => Date)
  leaseEnd?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rentAmount?: number;

  @IsOptional()
  @IsString()
  rentCurrency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @IsOptional()
  @IsIn(['active', 'pending', 'expired', 'terminated'])
  leaseStatus?: string;

  @IsOptional()
  @IsBoolean()
  autoPayEnabled?: boolean;

  @IsOptional()
  @IsIn(['card', 'bank_transfer', 'wallet'])
  autoPayMethod?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRentBudget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  affordabilityRatio?: number; // 0-100
}
