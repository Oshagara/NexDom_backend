import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './admin.schema';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { AuditLogService } from './audit-log.service';
import { MailService } from '../auth/mail.service';
import { PermissionsGuard } from './permissions.guard';
import { AdminRolesGuard } from './admin-roles.guard';
import { UsersSchema, User } from '../users/users.schema';
import { Tenant, TenantSchema } from '../tenants/tenants.schema';
import { Property, PropertySchema } from '../property/property.schema';
import { Payment, PaymentSchema } from '../payment/schema/payment.schema';
import { Activity, ActivitySchema } from './activity.schema';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityInterceptor } from './activity.interceptor';
import { UserActivityController } from './user-activity.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UsersSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: Property.name, schema: PropertySchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AdminService,
    JwtStrategy,
    AdminRolesGuard,
    PermissionsGuard,
    AuditLogService,
    MailService,
    ActivityService,
    ActivityInterceptor,
  ],
  controllers: [AdminController, ActivityController, UserActivityController],
  exports: [AdminService, ActivityService, AdminRolesGuard],
})
export class AdminModule {} 