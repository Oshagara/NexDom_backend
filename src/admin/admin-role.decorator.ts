import { SetMetadata } from '@nestjs/common';

export const AdminRole = (role: string) => SetMetadata('adminRole', role); 