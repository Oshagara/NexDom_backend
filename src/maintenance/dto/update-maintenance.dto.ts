import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaintenanceStatus } from '../schemas/maintenance.schema';

export class UpdateMaintenanceDto {
  @IsEnum(MaintenanceStatus)
  @IsOptional()
  status?: MaintenanceStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

