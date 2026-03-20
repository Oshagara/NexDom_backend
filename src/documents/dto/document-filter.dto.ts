import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentStatus, DocumentType } from '../schemas/document.schema';

export class DocumentFilterDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}

