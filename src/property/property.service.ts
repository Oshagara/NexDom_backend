import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Property, PropertyDocument, PropertyStatus } from './property.schema';
import { User, UserDocument } from '../users/users.schema';
import { ActivityService } from '../admin/activity.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<PropertyDocument>,
    @InjectModel(User.name) private agentUserModel: Model<UserDocument>,
    private activityService: ActivityService,
    private notificationsService: NotificationsService,
  ) {}

  // Create a new property posted by a landlord only
  async createProperty(createPropertyDto: any, userId: string, files: Express.Multer.File[]): Promise<Property> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.agentUserModel.findById(userId);

    const role = (user?.role || '').toLowerCase();
    const allowed = ['landlord', 'agent', 'admin'];
    if (!user || !allowed.includes(role)) {
      throw new ForbiddenException('Only landlords or agents are authorized to post properties');
    }

    const filesArray = files || [];
    const imagePaths = filesArray.map(file => file.path || file.filename); // string[]
    const imagesToSave = imagePaths.length > 0 ? imagePaths : (createPropertyDto?.images || []);
    const newProperty = new this.propertyModel({
      ...createPropertyDto,
      postedBy: user.agentId || user.userId,
      landlordId: user._id,
      images: imagesToSave,
      status: createPropertyDto?.status ?? 'pending',
      unitCount: createPropertyDto?.unitCount ?? 1,
      occupancyStatus: createPropertyDto?.occupancyStatus ?? 'vacant',
    });

    const saved = await newProperty.save();

    const title =
      createPropertyDto?.title ||
      createPropertyDto?.listingType ||
      createPropertyDto?.propertyType ||
      'property';

    // Fire-and-forget user-scoped activity logging.
    try {
      void this.activityService
        .logUserActivity(
          userId,
          'property_created',
          `New property listed: ${title}`,
          { propertyId: String(saved._id) },
        )
        .catch(() => {});
    } catch {}

    // Notify landlord/agent about the new listing
    try {
      const recipientId = String(user._id);
      await this.notificationsService.create({
        userId: recipientId,
        type: 'info' as any,
        title: 'Property listed',
        body: `Your property "${title}" was successfully created and is now ${saved.status}.`,
        metadata: { propertyId: String(saved._id) },
      }).catch(() => {});
    } catch {}

    return saved;
  }

  // Get properties posted by a specific landlord (supports both postedBy string and landlordId)
  async getPropertiesByLandlord(landlordId: string): Promise<PropertyDocument[]> {
    const isObjectId = isValidObjectId(landlordId);
    const query = isObjectId
      ? { $or: [{ postedBy: landlordId }, { landlordId: new Types.ObjectId(landlordId) }] }
      : { postedBy: landlordId };
    return this.propertyModel.find(query).exec();
  }

  // Get all properties (legacy, use findAll for filtered/paginated)
  async getAllProperties(): Promise<PropertyDocument[]> {
    return this.propertyModel.find().exec();
  }

  // Get a single property by ID
  async getPropertyById(id: string): Promise<PropertyDocument> {
    const property = await this.propertyModel.findById(id).exec();
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return property;
  }

  // Update property by ID
  async updateProperty(id: string, data: Partial<Property>): Promise<PropertyDocument> {
    const updatedProperty = await this.propertyModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!updatedProperty) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return updatedProperty;
  }

  // Delete property by ID
  async deleteProperty(id: string): Promise<PropertyDocument> {
    const deletedProperty = await this.propertyModel.findByIdAndDelete(id).exec();
    if (!deletedProperty) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return deletedProperty;
  }

  // Get properties with filters (admin/landlord)
  async findAll(filters: {
    status?: PropertyStatus;
    type?: string;
    landlordId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PropertyDocument[]; total: number; page: number; limit: number }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.landlordId) query.landlordId = new Types.ObjectId(filters.landlordId);

    const [data, total] = await Promise.all([
      this.propertyModel
        .find(query)
        .populate('landlordId', 'firstName lastName name email')
        .populate('currentTenantId', 'firstName lastName name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.propertyModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  // Admin: verify a property
  async verify(id: string): Promise<PropertyDocument> {
    const property = await this.propertyModel.findByIdAndUpdate(
      id,
      { status: 'verified' as PropertyStatus },
      { new: true },
    ).exec();
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return property;
  }

  // Admin: flag a property
  async flag(id: string): Promise<PropertyDocument> {
    const property = await this.propertyModel.findByIdAndUpdate(
      id,
      { status: 'flagged' as PropertyStatus },
      { new: true },
    ).exec();
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
    return property;
  }

  // Admin: property stats
  async getStats(): Promise<{
    total: number;
    verified: number;
    pending: number;
    flagged: number;
    fraudBlocked?: number;
  }> {
    const [total, verified, pending, flagged] = await Promise.all([
      this.propertyModel.countDocuments().exec(),
      this.propertyModel.countDocuments({ status: 'verified' }).exec(),
      this.propertyModel.countDocuments({ status: 'pending' }).exec(),
      this.propertyModel.countDocuments({ status: 'flagged' }).exec(),
    ]);
    return { total, verified, pending, flagged, fraudBlocked: 0 };
  }
}
