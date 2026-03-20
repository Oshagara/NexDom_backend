import { IsEnum, IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenancePriority, MaintenanceStatus } from '../schemas/maintenance.schema';

export class MaintenanceFilterDto {
  @IsMongoId()
  @IsOptional()
  tenantId?: string;

  @IsMongoId()
  @IsOptional()
  landlordId?: string;

  @IsMongoId()
  @IsOptional()
  propertyId?: string;

  @IsEnum(MaintenanceStatus)
  @IsOptional()
  status?: MaintenanceStatus;

  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

