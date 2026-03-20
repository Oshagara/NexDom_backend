import { Controller, Post, Body, UseGuards, Get, Req, Param, Patch, Delete, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRole } from './admin-role.decorator';
import { AdminRolesGuard } from './admin-roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { Request } from 'express';
import { CreateAdminDto, UpdateAdminDto, AdminLoginDto, ChangeAdminRoleDto, UpdateAdminPermissionsDto } from './dto/create-admin.dto';

@Controller('private')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public endpoint - no guards needed
  @Post('login')
  async login(@Body() body: AdminLoginDto, @Req() req: Request) {
    return this.adminService.login(body.email, body.password, req);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async logout(@Req() req: Request) {
    // @ts-ignore
    return this.adminService.logout(req.user, req);
  }

  // Protected endpoints - apply guards
  @Get('me/activity')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async myActivity(@Req() req: Request) {
    // @ts-ignore
    return this.adminService.getAdminActivity(req.user.email);
  }

  @Get('activity/:adminId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async adminActivity(@Param('adminId') adminId: string) {
    return this.adminService.getAdminActivityById(adminId);
  }

  @Get('superadmin-only')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  getSuperadminData() {
    return { message: 'Superadmin access granted' };
  }

  @Post('create-admin')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async createAdmin(@Body() body: CreateAdminDto, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.createAdmin(body, req.user);
  }

  @Patch('update-admin/:adminId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async updateAdmin(@Param('adminId') adminId: string, @Body() body: UpdateAdminDto, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.updateAdmin(adminId, body, req.user);
  }

  @Delete('delete-admin/:adminId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async deleteAdmin(@Param('adminId') adminId: string, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.deleteAdmin(adminId, req.user);
  }

  @Patch('change-role/:adminId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async changeAdminRole(@Param('adminId') adminId: string, @Body() body: ChangeAdminRoleDto, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.changeAdminRole(adminId, body.newRole, req.user);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async listAdmins(@Query() query: any) {
    return this.adminService.listAdmins(query);
  }

  @Get('admin-or-superadmin')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  getAdminData() {
    return { message: 'Admin or Superadmin access granted' };
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async getAuditLogs(@Query() query: any) {
    // Forward query params to service for filtering, pagination, sorting
    return this.adminService.getAuditLogs(query);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: { email: string }) {
    return this.adminService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.adminService.resetPassword(body.token, body.newPassword);
  }

  @Get('2fa/setup')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async generate2FASecret(@Req() req: Request) {
    // @ts-ignore
    return this.adminService.generate2FASecret(req.user.email);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async enable2FA(@Body() body: { token: string }, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.enable2FA(req.user.email, body.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async disable2FA(@Body() body: { password: string; token: string }, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.disable2FA(req.user.email, body.password, body.token);
  }

  @Post('impersonate')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async impersonate(@Body() body: { adminId?: string; email?: string }, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.impersonateAdmin(body, req.user);
  }

  @Patch('soft-delete/:adminId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async softDeleteAdmin(@Param('adminId') adminId: string, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.softDeleteAdmin(adminId, req.user);
  }

  @Patch('restore/:adminId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async restoreAdmin(@Param('adminId') adminId: string, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.restoreAdmin(adminId, req.user);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async updateMyProfile(@Body() body: { name?: string; email?: string; currentPassword: string }, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.updateMyProfile(req.user.email, body);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async updateMyPassword(@Body() body: { currentPassword: string; newPassword: string }, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.updateMyPassword(req.user.email, body.currentPassword, body.newPassword);
  }

  @Get('dashboard/summary')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRole('superadmin')
async getDashboardSummary(@Query("filter") filter: string) {
  const allowedFilters = ["day", "week", "month", "year"];
  const castedFilter = allowedFilters.includes(filter)
    ? (filter as "day" | "week" | "month" | "year")
    : undefined;

  return this.adminService.getDashboardSummary(castedFilter);
}


  @Get(':adminId/permissions')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async getAdminPermissions(@Param('adminId') adminId: string, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.getAdminPermissions(adminId, req.user);
  }

  @Patch(':adminId/permissions')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async updateAdminPermissions(@Param('adminId') adminId: string, @Body() body: UpdateAdminPermissionsDto, @Req() req: Request) {
    // @ts-ignore
    return this.adminService.updateAdminPermissions(adminId, body.permissions, req.user);
  }
} 