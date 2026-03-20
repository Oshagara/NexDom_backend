import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/users.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto/register.dto';
import { LoginDto } from './dto/login.dto/login.dto';
import { randomInt } from 'crypto';
import { MailService } from './mail.service';
import { ActivityService } from '../admin/activity.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private mailService: MailService,
    private jwtService: JwtService,
    private activityService: ActivityService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = randomInt(100000, 999999).toString();
    const verificationCodeExpires = new Date(Date.now() + (1 * 60 + 15) * 60 * 1000); // 1 hour 15 minutes

    const user = new this.userModel({
      ...dto,
      password: hashedPassword,
      userId: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      verificationCode,
      verificationCodeExpires,
    });

    await user.save();

    // Log activity: user registered
    await this.activityService.logActivity({
      userId: String(user._id),
      role: user.role || 'user',
      action: 'register',
      resource: 'user',
      resourceId: user.userId,
    });
    await this.mailService.sendVerificationEmail(user.email, verificationCode);

    return {
      message:
        'Registration successful. Please check your email for the verification code.',
    };
  }

 async login(dto: LoginDto, req?: any) {
  const email = dto.email.trim().toLowerCase();
  
  const user = await this.userModel
    .findOne({ email })
    .select('+password');

  if (!user) {
        try {
      await this.activityService.logActivity({
        userId: email,
        role: 'guest',
        action: 'login_failed',
        resource: 'auth',
        metadata: { reason: 'user_not_found' },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch {}
    throw new UnauthorizedException('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(dto.password, user.password);
  
  if (!isMatch) {
    try {
      await this.activityService.logActivity({
        userId: String(user._id),
        role: user.role || 'user',
        action: 'login_failed',
        resource: 'auth',
        metadata: { reason: 'password_mismatch' },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch {}
    throw new UnauthorizedException('Invalid credentials');
  }

  if (!user.isVerified) {
    try {
      await this.activityService.logActivity({
        userId: String(user._id),
        role: user.role || 'user',
        action: 'login_failed',
        resource: 'auth',
        metadata: { reason: 'email_not_verified' },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch {}
    throw new UnauthorizedException('Please verify your email before logging in.');
  }

  if (user.isBlocked) {
    try {
      await this.activityService.logActivity({
        userId: String(user._id),
        role: user.role || 'user',
        action: 'login_failed',
        resource: 'auth',
        metadata: { reason: 'user_blocked' },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch {}
    throw new UnauthorizedException('Your account has been blocked. Please contact support.');
  }

  const payload = {
    email: user.email,
    sub: user._id,
    userId: user.userId,
    role: user.role,
  };
  const token = this.jwtService.sign(payload);

  // Update lastLoginAt
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const result = {
    access_token: token,
    user: {
      id: user._id,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };

  // Log activity: user login
  await this.activityService.logActivity({
    userId: String(user._id),
    role: user.role || 'user',
    email: user.email,
    name: user.name,
    action: 'login',
    resource: 'auth',
    ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
    userAgent: req?.headers?.['user-agent'],
  });

  return result;
}

  async logout(req?: any) {
    const user = req?.user;
    if (user) {
      try {
        await this.activityService.logActivity({
          userId: String(user.sub || user.id || user._id || user.userId || ''),
          role: user.role || 'user',
          email: user.email,
          name: user.name,
          action: 'logout',
          resource: 'auth',
          ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress,
          userAgent: req?.headers?.['user-agent'],
        });
      } catch {}
    }
    // For stateless JWT, just acknowledge; client should drop token
    return { message: 'Logged out' };
  }
  // Verify email with code
async verifyEmailCode(email: string, code: string) {
  const user = await this.userModel.findOne({ email });
  
  if (!user) return false;

  // Ensure code matches
  if (user.verificationCode !== code) return false;

  // Check if the code is expired
  const now = new Date();
  if (!user.verificationCodeExpires || user.verificationCodeExpires.getTime() < now.getTime()) {
    return false;
  }

  // Update user verification status
  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  user.resendCount = 0;
  user.resendCooldown = undefined;

  await user.save();

  // Generate JWT token
  const payload = {
    email: user.email,
    sub: user._id,
    userId: user.userId,
    role: user.role,
  };
  const token = this.jwtService.sign(payload);

  return {
    message: 'Email verified successfully',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}



  // Resend verification code
  async resendVerificationCode(email: string) {
  const user = await this.userModel.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) throw new BadRequestException('Email not found');

  const now = new Date();

    // Block if user tries too many times
  if (user.resendCount >= 5) {
    throw new BadRequestException('You have exceeded the maximum number of attempts. Please try again later or contact support.');
  }
   // Check cooldown
  if (user.resendCooldown && user.resendCooldown > now) {
    const secondsLeft = Math.ceil((user.resendCooldown.getTime() - now.getTime()) / 1000);
    throw new BadRequestException(`Please wait ${secondsLeft}s before requesting again`);
  }
  // Generate new code and reset cooldown
  const newCode = randomInt(100000, 999999).toString();
  user.verificationCode = newCode;
  user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  user.resendCooldown = new Date(Date.now() + 60 * 1000); // 1-minute cooldown
  user.resendCount = (user.resendCount || 0) + 1;
  await user.save();

  await this.mailService.sendVerificationEmail(user.email, newCode);

  return { message: 'Verification code resent successfully' };
}

}
