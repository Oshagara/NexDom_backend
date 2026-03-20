import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<string>('adminRole', context.getHandler());
    if (!requiredRole) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new UnauthorizedException('No user found in request.');
    
    // Check if user is an admin (has admin role)
    if (!user.role || !['admin', 'superadmin'].includes(user.role)) {
      throw new UnauthorizedException('Admin access required.');
    }
    // Superadmin can access all admin routes; admin can access admin-level routes
    if (requiredRole === 'admin') return true;
    return user.role === requiredRole;
  }
} 