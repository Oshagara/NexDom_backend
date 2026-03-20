import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../schemas/document.schema';

export class UploadDocumentDto {
  @IsMongoId()
  userId: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  label: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

