import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { promises as fs } from 'fs';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import {
  Document,
  DocumentDocument,
  DocumentStatus,
  DocumentType,
} from './schemas/document.schema';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';

export interface KycStatus {
  verified: number;
  pending: number;
  rejected: number;
  total: number;
  isFullyVerified: boolean;
}

function resolveUserId(user: any): string {
  return String(user?.userId ?? user?.sub ?? user?._id);
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private buildFileUrl(filePath: string): string {
    const baseUrl = (process.env.BASE_URL ?? '').replace(/\/$/, '');
    // Ensure URL path uses forward slashes.
    const normalized = filePath.replace(/\\/g, '/');

    // Try to strip leading project root or "./" to make it a path relative to /uploads.
    const uploadsDir = (process.env.UPLOADS_DIR ?? './uploads').replace(/\\/g, '/');
    let relative = normalized;

    if (relative.startsWith(uploadsDir.replace(/^\.\/?/, ''))) {
      relative = relative.replace(new RegExp(`^${uploadsDir.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}/?`), '');
    }

    relative = relative.replace(/^\/+/, '');
    if (relative.startsWith('uploads/')) {
      return `${baseUrl}/${relative}`;
    }

    // Fallback: just join baseUrl + path.
    return `${baseUrl}/${relative}`;
  }

  async upload(userId: string, dto: UploadDocumentDto, file: Express.Multer.File): Promise<DocumentDocument> {
    if (!file) throw new BadRequestException('File is required');
    if (!userId) throw new BadRequestException('userId is required');

    const fileUrl = this.buildFileUrl(file.path);

    const saved = await this.documentModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      filePath: file.path,
      fileUrl,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: DocumentStatus.PENDING,
    });

    try {
      await this.notificationsService.create({
        userId,
        type: NotificationType.SYSTEM,
        title: 'Document uploaded',
        body: `Your document (${dto.type}) has been uploaded successfully.`,
      });
    } catch {}

    return saved;
  }

  async findByUser(userId?: string, filters?: DocumentFilterDto): Promise<DocumentDocument[]> {
    const query: Record<string, unknown> = {};

    if (userId) {
      query.userId = new Types.ObjectId(userId);
    } else if (filters?.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    if (filters?.type) query.type = filters.type;
    if (filters?.status) query.status = filters.status;

    return this.documentModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId?: string): Promise<DocumentDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid document id');

    const doc = await this.documentModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Document not found');

    if (userId && String(doc.userId) !== userId) {
      throw new ForbiddenException('You do not have permission to access this document');
    }

    return doc;
  }

  async verify(id: string, dto: VerifyDocumentDto, adminId: string): Promise<DocumentDocument> {
    const doc = await this.documentModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Document not found');

    if (dto.status === DocumentStatus.VERIFIED) {
      doc.status = DocumentStatus.VERIFIED;
      doc.verifiedAt = new Date();
      doc.verifiedBy = new Types.ObjectId(adminId);
      doc.rejectionReason = undefined;
    }

    if (dto.status === DocumentStatus.REJECTED) {
      if (!dto.rejectionReason || dto.rejectionReason.trim().length === 0) {
        throw new BadRequestException('rejectionReason is required when rejecting');
      }
      doc.status = DocumentStatus.REJECTED;
      doc.verifiedAt = undefined;
      doc.verifiedBy = new Types.ObjectId(adminId);
      doc.rejectionReason = dto.rejectionReason;
    }

    const updated = await doc.save();

    try {
      if (dto.status === DocumentStatus.VERIFIED) {
        await this.notificationsService.create({
          userId: String(updated.userId),
          type: NotificationType.KYC_VERIFIED,
          title: 'Document verified',
          body: 'Your KYC document has been verified successfully.',
          metadata: { documentId: updated._id, type: updated.type },
        });
      } else {
        await this.notificationsService.create({
          userId: String(updated.userId),
          type: NotificationType.SYSTEM,
          title: 'Document needs resubmission',
          body: `Your document was rejected. Reason: ${dto.rejectionReason}`,
          metadata: { documentId: updated._id, type: updated.type, rejectionReason: dto.rejectionReason },
        });
      }
    } catch {}

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.findOne(id, userId);
    try {
      await fs.unlink(doc.filePath);
    } catch {}

    await this.documentModel.deleteOne({ _id: doc._id });
  }

  async getKycStatus(userId: string): Promise<KycStatus> {
    const userObjectId = new Types.ObjectId(userId);

    const [verified, pending, rejected, total] = await Promise.all([
      this.documentModel.countDocuments({ userId: userObjectId, status: DocumentStatus.VERIFIED }),
      this.documentModel.countDocuments({ userId: userObjectId, status: DocumentStatus.PENDING }),
      this.documentModel.countDocuments({ userId: userObjectId, status: DocumentStatus.REJECTED }),
      this.documentModel.countDocuments({ userId: userObjectId }),
    ]);

    const [verifiedNationalId, verifiedProofOfAddress] = await Promise.all([
      this.documentModel.countDocuments({
        userId: userObjectId,
        status: DocumentStatus.VERIFIED,
        type: DocumentType.NATIONAL_ID,
      }),
      this.documentModel.countDocuments({
        userId: userObjectId,
        status: DocumentStatus.VERIFIED,
        type: DocumentType.PROOF_OF_ADDRESS,
      }),
    ]);

    const isFullyVerified = verifiedNationalId > 0 && verifiedProofOfAddress > 0;

    return {
      verified,
      pending,
      rejected,
      total,
      isFullyVerified,
    };
  }

  async getExpiringDocuments(daysAhead: number): Promise<DocumentDocument[]> {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);

    return this.documentModel
      .find({
        expiresAt: { $gte: now, $lte: end },
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}

