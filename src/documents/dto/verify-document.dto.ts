import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DocumentStatus } from '../schemas/document.schema';

export class VerifyDocumentDto {
  @IsEnum([DocumentStatus.VERIFIED, DocumentStatus.REJECTED])
  status: DocumentStatus.VERIFIED | DocumentStatus.REJECTED;

  @ValidateIf(o => o.status === DocumentStatus.REJECTED)
  @IsNotEmpty()
  @IsString()
  rejectionReason?: string;
}

