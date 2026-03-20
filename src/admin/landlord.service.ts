import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Landlord, LandlordDocument } from './landlord.schema';

@Injectable()
export class LandlordService {
  constructor(
    @InjectModel(Landlord.name) private landlordModel: Model<LandlordDocument>,
  ) {}

  /**
   * Get landlord profile by ID or landlordId
   */
  async getLandlordProfile(landlordId: string): Promise<any> {
    const landlord = await this.landlordModel.findOne({
      $or: [{ _id: landlordId }, { landlordId }]
    }).lean();

    if (!landlord) {
      throw new NotFoundException('Landlord not found');
    }

    // Return basic profile information (exclude sensitive data)
    return {
      id: landlord._id,
      landlordId: landlord.landlordId,
      name: landlord.name,
      email: landlord.email,
      phone: landlord.phone,
      address: landlord.address,
      city: landlord.city,
      state: landlord.state,
      zipCode: landlord.zipCode,
      country: landlord.country,
      profilePicture: landlord.profilePicture,
      bio: landlord.bio,
      status: landlord.status,
      isVerified: landlord.isVerified,
      businessName: landlord.businessName,
      createdAt: landlord.createdAt,
      updatedAt: landlord.updatedAt,
    };
  }

  /**
   * Get landlord profile with additional details (for admin use)
   */
  async getLandlordProfileDetailed(landlordId: string): Promise<any> {
    const landlord = await this.landlordModel.findOne({
      $or: [{ _id: landlordId }, { landlordId }]
    }).lean();

    if (!landlord) {
      throw new NotFoundException('Landlord not found');
    }

    return {
      id: landlord._id,
      landlordId: landlord.landlordId,
      name: landlord.name,
      email: landlord.email,
      phone: landlord.phone,
      address: landlord.address,
      city: landlord.city,
      state: landlord.state,
      zipCode: landlord.zipCode,
      country: landlord.country,
      profilePicture: landlord.profilePicture,
      bio: landlord.bio,
      status: landlord.status,
      isVerified: landlord.isVerified,
      isBlocked: landlord.isBlocked,
      businessName: landlord.businessName,
      taxId: landlord.taxId,
      licenseNumber: landlord.licenseNumber,
      lastLoginAt: landlord.lastLoginAt,
      lastLoginIp: landlord.lastLoginIp,
      emailNotifications: landlord.emailNotifications,
      smsNotifications: landlord.smsNotifications,
      language: landlord.language,
      currency: landlord.currency,
      createdAt: landlord.createdAt,
      updatedAt: landlord.updatedAt,
    };
  }

  /**
   * Get all landlords with pagination and filtering
   */
  async getAllLandlords(query: {
    search?: string;
    status?: string;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: any[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const filter: any = { deleted: { $ne: true } };

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { businessName: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.isVerified !== undefined) {
      filter.isVerified = query.isVerified;
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const sort: any = {};
    if (query.sortBy) {
      sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const [data, total] = await Promise.all([
      this.landlordModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.landlordModel.countDocuments(filter),
    ]);

    // Remove sensitive information
    const sanitizedData = data.map(landlord => ({
      id: landlord._id,
      landlordId: landlord.landlordId,
      name: landlord.name,
      email: landlord.email,
      phone: landlord.phone,
      city: landlord.city,
      state: landlord.state,
      profilePicture: landlord.profilePicture,
      status: landlord.status,
      isVerified: landlord.isVerified,
      businessName: landlord.businessName,
      createdAt: landlord.createdAt,
    }));

    return {
      data: sanitizedData,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get landlord statistics
   */
  async getLandlordStats(): Promise<{
    totalLandlords: number;
    activeLandlords: number;
    verifiedLandlords: number;
    blockedLandlords: number;
  }> {
    const [
      totalLandlords,
      activeLandlords,
      verifiedLandlords,
      blockedLandlords,
    ] = await Promise.all([
      this.landlordModel.countDocuments({ deleted: { $ne: true } }),
      this.landlordModel.countDocuments({ deleted: { $ne: true }, status: 'active' }),
      this.landlordModel.countDocuments({ deleted: { $ne: true }, isVerified: true }),
      this.landlordModel.countDocuments({ deleted: { $ne: true }, isBlocked: true }),
    ]);

    return {
      totalLandlords,
      activeLandlords,
      verifiedLandlords,
      blockedLandlords,
    };
  }
}