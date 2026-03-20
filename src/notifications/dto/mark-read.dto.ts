import { IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkReadDto {
  @IsArray()
  @IsMongoId({ each: true })
  notificationIds: string[];
}

