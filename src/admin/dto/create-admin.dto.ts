import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class ChangeAdminRoleDto {
  @IsNotEmpty()
  @IsString()
  newRole: string;
}

export class UpdateAdminPermissionsDto {
  @IsNotEmpty()
  permissions: string[];
} 