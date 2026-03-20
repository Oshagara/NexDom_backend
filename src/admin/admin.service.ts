import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './admin.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { randomBytes } from 'crypto';
import { MailService } from '../auth/mail.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as nodemailer from 'nodemailer';
import { User, UserDocument } from '../users/users.schema';
import { Tenant, TenantDocument } from '../tenants/tenants.schema';
import { Property } from '../property/property.schema';
import { Payment } from '../payment/schema/payment.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
    private auditLogService: AuditLogService,
    private mailService: MailService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel('Tenant') private tenantModel: Model<TenantDocument>,
    @InjectModel('Property') private propertyModel: Model<any>,
    @InjectModel('Payment') private paymentModel: Model<any>,
    private activityService: ActivityService,
  ) {}

  async validateAdmin(email: string, password: string) {
    const admin = await this.adminModel.findOne({ email }).select('+password').lean();
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      // Failed admin login attempt
      try {
        await this.activityService.logActivity({
          userId: email,
          role: 'guest',
          action: 'login_failed',
          resource: 'auth',
          metadata: { reason: 'invalid_credentials' },
        });
      } catch {}
      throw new UnauthorizedException('Invalid credentials');
    }
    if (admin.status !== 'active') {
      throw new UnauthorizedException('Admin account is not active');
    }
    return admin;
  }

  async login(email: string, password: string, req?: any) {
    const admin = await this.validateAdmin(email, password);
    // If 2FA is enabled, require 2faCode
    if (admin.twoFactorEnabled) {
      const code = req?.body?.twofaCode || req?.body?.twoFactorCode || req?.body?.code;
      if (!code) throw new ForbiddenException('2FA code required');
      const valid2fa = speakeasy.totp.verify({
        secret: admin.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      });
      if (!valid2fa) throw new ForbiddenException('Invalid 2FA code');
    }
    // Update last login info
    const prevIp = admin.lastLoginIp;
    const currentIp = req?.ip || req?.headers['x-forwarded-for'] || req?.connection?.remoteAddress;
    await this.adminModel.updateOne(
      { _id: admin._id },
      {
        lastLoginAt: new Date(),
        lastLoginIp: currentIp,
        lastLoginUserAgent: req?.headers['user-agent'] || '',
      }
    );
    await this.auditLogService?.logAction?.({
      action: 'login',
      performedBy: admin.email,
      details: 'Admin logged in',
      ip: currentIp,
    });
    // Activity: admin login
    await this.activityService.logActivity({
      userId: String(admin._id),
      role: admin.role || 'admin',
      email: admin.email,
      name: admin.name,
      action: 'login',
      resource: 'auth',
      ip: currentIp,
      userAgent: req?.headers?.['user-agent'] || '',
    });
    // Notify on suspicious login (new IP)
    if (prevIp && prevIp !== currentIp) {
      await this.sendAdminNotificationEmail(admin.email, 'Suspicious Login Detected', `<p>Your admin account was accessed from a new device or IP address: <b>${currentIp}</b>. If this was not you, please reset your password immediately.</p>`);
    }
    const payload = { email: admin.email, sub: admin._id, role: admin.role, permissions: admin.permissions };
    const token = this.jwtService.sign(payload);
    return {
      access_token: token,
      admin: { id: admin._id, adminId: admin.adminId, email: admin.email, name: admin.name, role: admin.role },
    };
  }

  async logout(currentAdmin: any, req?: any) {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress;
    try {
      await this.activityService.logActivity({
        userId: String(currentAdmin.sub || currentAdmin.id || currentAdmin._id || ''),
        role: currentAdmin.role || 'admin',
        email: currentAdmin.email,
        name: currentAdmin.name,
        action: 'logout',
        resource: 'auth',
        ip,
        userAgent: req?.headers?.['user-agent'] || '',
      });
    } catch {}
    return { message: 'Logged out' };
  }
  // Add admin management methods here

  async createAdmin(dto: { name: string; email: string; password: string; role?: string }, creator: any) {
    if (creator.role !== 'superadmin') throw new ForbiddenException('Only superadmin can create admins');
    const exists = await this.adminModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');
    const hash = await bcrypt.hash(dto.password, 10);
    const admin = new this.adminModel({
      ...dto,
      password: hash,
      adminId: `ADM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: dto.role || 'admin',
      status: 'active',
    });
    await admin.save();
    await this.auditLogService.logAction({
      action: 'createAdmin',
      performedBy: creator.email,
      target: admin.email,
      details: `Created admin with role ${admin.role}`,
    });
    await this.activityService.logActivity({
      userId: String(creator.sub || creator.id || creator._id || ''),
      role: creator.role || 'admin',
      action: 'createAdmin',
      resource: 'admin',
      resourceId: admin.adminId,
    });
    await this.sendAdminNotificationEmail(admin.email, 'Welcome as an Admin', `<p>Your admin account has been created. Your role: <b>${admin.role}</b>.</p>`);
    return { message: 'Admin created successfully', admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role } };
  }

  async updateAdmin(adminId: string, dto: { name?: string; email?: string; password?: string; role?: string; status?: string }, updater: any) {
    if (updater.role !== 'superadmin') throw new ForbiddenException('Only superadmin can update admins');
    const admin = await this.adminModel.findOne({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);
    Object.assign(admin, dto);
    await admin.save();
    await this.auditLogService.logAction({
      action: 'updateAdmin',
      performedBy: updater.email,
      target: admin.email,
      details: `Updated admin fields: ${Object.keys(dto).join(', ')}`,
    });
    await this.activityService.logActivity({
      userId: String(updater.sub || updater.id || updater._id || ''),
      role: updater.role || 'admin',
      action: 'updateAdmin',
      resource: 'admin',
      resourceId: admin.adminId,
      metadata: { fields: Object.keys(dto) },
    });
    return { message: 'Admin updated successfully' };
  }

  async deleteAdmin(adminId: string, deleter: any) {
    if (deleter.role !== 'superadmin') throw new ForbiddenException('Only superadmin can delete admins');
    const admin = await this.adminModel.findOneAndDelete({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    await this.auditLogService.logAction({
      action: 'deleteAdmin',
      performedBy: deleter.email,
      target: admin.email,
      details: `Deleted admin`,
    });
    await this.activityService.logActivity({
      userId: String(deleter.sub || deleter.id || deleter._id || ''),
      role: deleter.role || 'admin',
      action: 'deleteAdmin',
      resource: 'admin',
      resourceId: admin.adminId,
    });
    return { message: 'Admin deleted successfully' };
  }

  async changeAdminRole(adminId: string, newRole: string, changer: any) {
    if (changer.role !== 'superadmin') throw new ForbiddenException('Only superadmin can change admin roles');
    const admin = await this.adminModel.findOne({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    admin.role = newRole;
    await admin.save();
    await this.auditLogService.logAction({
      action: 'changeAdminRole',
      performedBy: changer.email,
      target: admin.email,
      details: `Changed role to ${newRole}`,
    });
    await this.activityService.logActivity({
      userId: String(changer.sub || changer.id || changer._id || ''),
      role: changer.role || 'admin',
      action: 'changeAdminRole',
      resource: 'admin',
      resourceId: admin.adminId,
      metadata: { newRole },
    });
    await this.sendAdminNotificationEmail(admin.email, 'Admin Role Changed', `<p>Your admin role has been changed to <b>${newRole}</b>.</p>`);
    return { message: 'Admin role updated successfully' };
  }

  async softDeleteAdmin(adminId: string, deleter: any) {
    if (deleter.role !== 'superadmin') throw new ForbiddenException('Only superadmin can delete admins');
    const admin = await this.adminModel.findOne({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.deleted) throw new ConflictException('Admin already deleted');
    admin.deleted = true;
    admin.deletedAt = new Date();
    await admin.save();
    await this.auditLogService.logAction({
      action: 'softDeleteAdmin',
      performedBy: deleter.email,
      target: admin.email,
      details: 'Soft deleted admin',
    });
    await this.activityService.logActivity({
      userId: String(deleter.sub || deleter.id || deleter._id || ''),
      role: deleter.role || 'admin',
      action: 'softDeleteAdmin',
      resource: 'admin',
      resourceId: admin.adminId,
    });
    await this.sendAdminNotificationEmail(admin.email, 'Admin Account Deleted', `<p>Your admin account has been deleted by a superadmin. If this was not expected, please contact support.</p>`);
    return { message: 'Admin soft deleted successfully' };
  }

  async restoreAdmin(adminId: string, restorer: any) {
    if (restorer.role !== 'superadmin') throw new ForbiddenException('Only superadmin can restore admins');
    const admin = await this.adminModel.findOne({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!admin.deleted) throw new ConflictException('Admin is not deleted');
    admin.deleted = false;
    admin.deletedAt = undefined;
    await admin.save();
    await this.auditLogService.logAction({
      action: 'restoreAdmin',
      performedBy: restorer.email,
      target: admin.email,
      details: 'Restored admin',
    });
    await this.activityService.logActivity({
      userId: String(restorer.sub || restorer.id || restorer._id || ''),
      role: restorer.role || 'admin',
      action: 'restoreAdmin',
      resource: 'admin',
      resourceId: admin.adminId,
    });
    await this.sendAdminNotificationEmail(admin.email, 'Admin Account Restored', `<p>Your admin account has been restored by a superadmin.</p>`);
    return { message: 'Admin restored successfully' };
  }

  async listAdmins(query: { search?: string; role?: string; status?: string; page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; showDeleted?: boolean }) {
    const filter: any = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (!query.showDeleted) filter.deleted = { $ne: true };
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;
    const sort: any = {};
    if (query.sortBy) sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    else sort.createdAt = -1;
    const [admins, total] = await Promise.all([
      this.adminModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.adminModel.countDocuments(filter),
    ]);
    return {
      data: admins,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminActivity(email: string) {
    const admin = await this.adminModel.findOne({ email }).lean();
    if (!admin) throw new NotFoundException('Admin not found');
    return {
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
      lastLoginIp: admin.lastLoginIp,
      lastLoginUserAgent: admin.lastLoginUserAgent,
    };
  }

  async getAdminActivityById(adminId: string) {
    const admin = await this.adminModel.findOne({ adminId }).lean();
    if (!admin) throw new NotFoundException('Admin not found');
    return {
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
      lastLoginIp: admin.lastLoginIp,
      lastLoginUserAgent: admin.lastLoginUserAgent,
    };
  }

  async requestPasswordReset(email: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    admin.resetPasswordToken = token;
    admin.resetPasswordExpires = expires;
    await admin.save();
    // Send email
    await this.sendAdminResetEmail(admin.email, token);
    await this.sendAdminNotificationEmail(admin.email, 'Password Reset Requested', `<p>A password reset was requested for your admin account. If this was not you, please contact support immediately.</p>`);
    await this.auditLogService.logAction({
      action: 'requestPasswordReset',
      performedBy: admin.email,
      details: 'Requested password reset',
    });
    return { message: 'Password reset email sent' };
  }

  private async sendAdminResetEmail(email: string, token: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    const resetUrl = `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/admin/reset-password?token=${token}`;
    await transporter.sendMail({
      from: `"Infinity Housing" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Admin Password Reset',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`
    });
  }

  async resetPassword(token: string, newPassword: string) {
    const admin = await this.adminModel.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    if (!admin) throw new NotFoundException('Invalid or expired reset token');
    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();
    await this.auditLogService.logAction({
      action: 'resetPassword',
      performedBy: admin.email,
      details: 'Password was reset',
    });
    return { message: 'Password has been reset successfully' };
  }

  async generate2FASecret(email: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');
    const secret = speakeasy.generateSecret({ name: `Infinity Housing Admin (${admin.email})` });
    admin.twoFactorSecret = secret.base32;
    await admin.save();
    const otpauthUrl = secret.otpauth_url;
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
    return { otpauthUrl, qrCodeDataURL };
  }

  async verify2FA(email: string, token: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin || !admin.twoFactorSecret) throw new NotFoundException('2FA not set up');
    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    return verified;
  }

  async enable2FA(email: string, token: string) {
    const verified = await this.verify2FA(email, token);
    if (!verified) throw new ForbiddenException('Invalid 2FA code');
    await this.adminModel.updateOne({ email }, { twoFactorEnabled: true });
    await this.auditLogService.logAction({
      action: 'enable2FA',
      performedBy: email,
      details: 'Enabled 2FA',
    });
    await this.sendAdminNotificationEmail(email, '2FA Enabled', `<p>Two-Factor Authentication (2FA) has been enabled on your admin account.</p>`);
    return { message: '2FA enabled' };
  }

  async disable2FA(email: string, password: string, token: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!(await bcrypt.compare(password, admin.password))) throw new ForbiddenException('Invalid password');
    const verified = await this.verify2FA(email, token);
    if (!verified) throw new ForbiddenException('Invalid 2FA code');
    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    await admin.save();
    await this.auditLogService.logAction({
      action: 'disable2FA',
      performedBy: email,
      details: 'Disabled 2FA',
    });
    await this.sendAdminNotificationEmail(email, '2FA Disabled', `<p>Two-Factor Authentication (2FA) has been disabled on your admin account.</p>`);
    return { message: '2FA disabled' };
  }

  async impersonateAdmin(body: { adminId?: string; email?: string }, superadmin: any) {
    if (superadmin.role !== 'superadmin') throw new ForbiddenException('Only superadmin can impersonate admins');
    const admin = body.adminId
      ? await this.adminModel.findOne({ adminId: body.adminId })
      : await this.adminModel.findOne({ email: body.email });
    if (!admin) throw new NotFoundException('Target admin not found');
    const payload = {
      email: admin.email,
      sub: admin._id,
      role: admin.role,
      permissions: admin.permissions,
      impersonatedBy: superadmin.email,
    };
    const token = this.jwtService.sign(payload);
    await this.auditLogService.logAction({
      action: 'impersonateAdmin',
      performedBy: superadmin.email,
      target: admin.email,
      details: `Superadmin impersonated admin`,
    });
    return {
      access_token: token,
      admin: { id: admin._id, adminId: admin.adminId, email: admin.email, name: admin.name, role: admin.role },
      impersonatedBy: superadmin.email,
    };
  }

  getAuditLogs(query: any) {
    return this.auditLogService.getLogs(query);
  }

  async updateMyProfile(email: string, body: { name?: string; email?: string; currentPassword: string }) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!(await bcrypt.compare(body.currentPassword, admin.password))) throw new ForbiddenException('Invalid current password');
    let changedFields: string[] = [];
    if (body.name && body.name !== admin.name) {
      admin.name = body.name;
      changedFields.push('name');
    }
    if (body.email && body.email !== admin.email) {
      admin.email = body.email;
      changedFields.push('email');
    }
    await admin.save();
    await this.auditLogService.logAction({
      action: 'updateMyProfile',
      performedBy: email,
      details: `Updated profile fields: ${changedFields.join(', ')}`,
    });
    await this.activityService.logActivity({
      userId: String(admin._id),
      role: admin.role || 'admin',
      action: 'updateMyProfile',
      resource: 'admin',
      resourceId: admin.adminId,
      metadata: { fields: changedFields },
    });
    if (changedFields.includes('email')) {
      await this.sendAdminNotificationEmail(admin.email, 'Admin Email Changed', `<p>Your admin email has been changed. If this was not you, please contact support immediately.</p>`);
    }
    return { message: 'Profile updated successfully' };
  }

  async updateMyPassword(email: string, currentPassword: string, newPassword: string) {
    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new NotFoundException('Admin not found');
    if (!(await bcrypt.compare(currentPassword, admin.password))) throw new ForbiddenException('Invalid current password');
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    await this.auditLogService.logAction({
      action: 'updateMyPassword',
      performedBy: email,
      details: 'Changed password',
    });
    await this.activityService.logActivity({
      userId: String(admin._id),
      role: admin.role || 'admin',
      action: 'updateMyPassword',
      resource: 'admin',
      resourceId: admin.adminId,
    });
    await this.sendAdminNotificationEmail(admin.email, 'Admin Password Changed', `<p>Your admin password has been changed. If this was not you, please contact support immediately.</p>`);
    return { message: 'Password updated successfully' };
  }

// async getDashboardSummary() {
//   const [
//     totalAdmins,
//     activeAdmins,
//     superadmins,
//     totalAgents,
//     totalTenants,
//     totalLandlords,

//     totalProperties,
//     totalProperties4Rent,
//     totalProperties4Sale,

//     totalPayments
//   ] = await Promise.all([
//     this.adminModel.countDocuments({ deleted: { $ne: true } }),
//     this.adminModel.countDocuments({ deleted: { $ne: true }, status: "active" }),
//     this.adminModel.countDocuments({ deleted: { $ne: true }, role: "superadmin" }),

//     // 👇 Agents
//     this.userModel.countDocuments({ role: "agent" }),

//     // 👇 Tenants
//     this.userModel.countDocuments({ role: "tenant" }),

//     // 👇 Landlords
//     this.userModel.countDocuments({ role: "landlord" }),

//     // 👇 Properties
//     this.propertyModel.countDocuments({}),
//     this.propertyModel.countDocuments({ listingType: "For Rent" }),
//     this.propertyModel.countDocuments({ listingType: "For Sale" }),

//     // 👇 Payments
//     this.paymentModel.countDocuments({})
//   ]);

//   return {
//     totalAdmins,
//     activeAdmins,
//     superadmins,
//     totalAgents,
//     totalTenants,
//     totalLandlords,

//     totalProperties,
//     totalProperties4Rent,
//     totalProperties4Sale,

//     totalPayments
//   };
// }

async getDashboardSummary(filter: "day" | "week" | "month" | "year" = "month") {
  const [
    totalAdmins,
    activeAdmins,
    superadmins,
    totalAgents,
    totalTenants,
    totalLandlords,
    totalProperties,

    // Property types
    totalBungalow,
    totalDuplex,
    totalFlat,
    totalSelfContain,
    totalTerraced,
    totalMansion,

    // Listing types
    totalProperties4Rent,
    totalProperties4Sale,

    // Payments + trend
    totalPayments,
    propertiesTrend,
  ] = await Promise.all([
    this.adminModel.countDocuments({ deleted: { $ne: true } }),
    this.adminModel.countDocuments({ deleted: { $ne: true }, status: "active" }),
    this.adminModel.countDocuments({ deleted: { $ne: true }, role: "superadmin" }),

    this.userModel.countDocuments({ role: "agent" }),
    this.userModel.countDocuments({ role: "tenant" }),
    this.userModel.countDocuments({ role: "landlord" }),

    this.propertyModel.countDocuments({}),

    this.propertyModel.countDocuments({ propertyType: "Bungalow" }),
    this.propertyModel.countDocuments({ propertyType: "Duplex" }),
    this.propertyModel.countDocuments({ propertyType: "Flat" }),
    this.propertyModel.countDocuments({ propertyType: "Self-Contain" }),
    this.propertyModel.countDocuments({ propertyType: "Terraced" }),
    this.propertyModel.countDocuments({ propertyType: "Mansion" }),

    this.propertyModel.countDocuments({ listingType: "For Rent" }),   // ✅ added
    this.propertyModel.countDocuments({ listingType: "For Sale" }),   // ✅ added

    this.paymentModel.countDocuments({}),

    this.aggregatePropertiesTrend(filter),
  ]);

  return {
    totalAdmins,
    activeAdmins,
    superadmins,
    totalAgents,
    totalTenants,
    totalLandlords,
    totalProperties,

    totalBungalow,
    totalDuplex,
    totalFlat,
    totalSelfContain,
    totalTerraced,
    totalMansion,

    totalProperties4Rent,
    totalProperties4Sale,

    totalPayments,

    propertiesTrend, // for charts
  };
}


private async aggregatePropertiesTrend(filter: string) {
  let dateFormat = "%Y-%m-%d"; // default daily
  if (filter === "month") dateFormat = "%Y-%m";
  if (filter === "year") dateFormat = "%Y";
  if (filter === "week") dateFormat = "%Y-%U"; // week number

  return this.propertyModel.aggregate([
    {
      $group: {
        _id: {
          date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          type: "$listingType",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        counts: {
          $push: { type: "$_id.type", count: "$count" },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}



  async getAdminPermissions(adminId: string, requester: any) {
    if (requester.role !== 'superadmin') throw new ForbiddenException('Only superadmin can view admin permissions');
    const admin = await this.adminModel.findOne({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    return { permissions: admin.permissions || [] };
  }

  async updateAdminPermissions(adminId: string, permissions: string[], updater: any) {
    if (updater.role !== 'superadmin') throw new ForbiddenException('Only superadmin can update admin permissions');
    const admin = await this.adminModel.findOne({ adminId });
    if (!admin) throw new NotFoundException('Admin not found');
    admin.permissions = permissions;
    await admin.save();
    await this.auditLogService.logAction({
      action: 'updateAdminPermissions',
      performedBy: updater.email,
      target: admin.email,
      details: `Updated permissions: ${permissions.join(', ')}`,
    });
    await this.activityService.logActivity({
      userId: String(updater.sub || updater.id || updater._id || ''),
      role: updater.role || 'admin',
      action: 'updateAdminPermissions',
      resource: 'admin',
      resourceId: admin.adminId,
    });
    await this.sendAdminNotificationEmail(admin.email, 'Admin Permissions Updated', `<p>Your admin permissions have been updated by a superadmin.</p>`);
    return { message: 'Admin permissions updated successfully' };
  }

  private async sendAdminNotificationEmail(email: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: `"Infinity Housing" <${process.env.MAIL_USER}>`,
      to: email,
      subject,
      html,
    });
  }
} 