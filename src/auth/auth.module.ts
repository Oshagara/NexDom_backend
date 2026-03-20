import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UsersSchema } from '../users/users.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ActivityService } from '../admin/activity.service';
import { Activity, ActivitySchema } from '../admin/activity.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UsersSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Reads from .env
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, MailService, ActivityService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
