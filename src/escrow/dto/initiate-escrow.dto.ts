import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateEscrowDto {
  @IsNotEmpty()
  @IsString()
  buyerId: string;

  @IsNotEmpty()
  @IsString()
  sellerId: string;

  @IsNotEmpty()
  @IsString()
  propertyId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsIn(['rent_deposit', 'rent_advance', 'property_purchase', 'shortlet', 'other'])
  purpose?: string;

  @IsOptional()
  @Type(() => Date)
  rentPeriodStart?: Date;

  @IsOptional()
  @Type(() => Date)
  rentPeriodEnd?: Date;

  @IsOptional()
  @IsString()
  currency?: string; // Default: NGN
}

