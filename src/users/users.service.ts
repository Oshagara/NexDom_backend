import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UsersSchema } from './users.schema';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<typeof UsersSchema>,
    private readonly authService: AuthService,
  ) {}

  async createUser(userData: any) {
    // Delegate user creation to AuthService to ensure password is hashed
    return this.authService.register(userData);
  }

  async getUserById(userId: string) {
    return this.userModel.findOne({ userId });
  }

async getUsersByRole(role: string) {
  return this.userModel.find({
    role: { $regex: new RegExp(`^${role}$`, 'i') }, // matches "agent", "Agent", "AGENT"
  }).exec();
}

  async getAllUsers() {
    return this.userModel.find();
  }

  async updateUser(userId: string, updateData: any) {
    return this.userModel.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async deleteUser(userId: string) {
    return this.userModel.findByIdAndDelete(userId);
  }
}
