import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
    if (!requiredPermission) return true;
    
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new UnauthorizedException('No user found in request.');
    
    // Superadmin always allowed
    if (user.role === 'superadmin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(requiredPermission);
  }
} 