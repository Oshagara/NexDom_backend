import { IsEnum, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';
import { MaintenancePriority, MaintenanceType } from '../schemas/maintenance.schema';

export class CreateMaintenanceDto {
  @IsMongoId()
  tenantId: string;

  @IsMongoId()
  landlordId: string;

  @IsMongoId()
  propertyId: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority;
}

