import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Escrow, EscrowDocument } from './escrow.schema';
import { InitiateEscrowDto } from './dto/initiate-escrow.dto';
import { PaymentService } from '../payment/payment.service';
import { InjectModel as InjectMongooseModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from '../transactions/transaction.schema';
import { ActivityService } from '../admin/activity.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EscrowService {
  constructor(
    @InjectModel(Escrow.name) private escrowModel: Model<EscrowDocument>,
    private paymentService: PaymentService,
    @InjectMongooseModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private activityService: ActivityService,
    private events: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async initiate(dto: InitiateEscrowDto) {
    const referenceId = `esc-${dto.buyerId}-${dto.propertyId}-${Date.now()}`;
    const payment = await this.paymentService.initiatePayment({
      amount: dto.amount,
      email: dto.email,
      name: dto.name,
      userId: dto.buyerId,
      method: 'property_payment',
      headers: { 'Idempotency-Key': referenceId },
    });

    const escrow = await this.escrowModel.create({
      buyerId: dto.buyerId,
      sellerId: dto.sellerId,
      propertyId: dto.propertyId,
      tenantId: dto.tenantId,
      amount: dto.amount,
      currency: dto.currency ?? 'NGN',
      referenceId: payment?.data?.tx_ref || payment?.data?.data?.tx_ref || referenceId,
      status: 'initiated',
      purpose: (dto.purpose as any) ?? 'other',
      rentPeriodStart: dto.rentPeriodStart,
      rentPeriodEnd: dto.rentPeriodEnd,
      metadata: { gatewayResponse: payment?.data || payment },
    });
    await this.transactionModel.create({
      userId: dto.buyerId,
      type: 'property-payment',
      amount: dto.amount,
      currency: 'NGN',
      status: 'pending',
      referenceId: escrow.referenceId,
      metadata: { propertyId: dto.propertyId, sellerId: dto.sellerId },
    });

    // Fire-and-forget user-scoped activity logging (never crash initiation flow).
    try {
      void this.activityService
        .logUserActivity(
          dto.buyerId,
          'escrow_initiated',
          `Escrow initiated for property ${dto.propertyId}`,
          { escrowId: escrow.referenceId, amount: dto.amount },
        )
        .catch(() => {});
    } catch {}

    // Notify tenant about escrow initiation (never crash initiation flow).
    try {
      void this.notificationsService
        .notifyEscrowUpdate(dto.buyerId, escrow.referenceId, 'initiated')
        .catch(() => {});
    } catch {}

    return { payment, escrow };
  }

  async setHeldByReference(referenceId: string) {
    const escrow = await this.escrowModel.findOne({ referenceId }).exec();
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status === 'held') return escrow;
    if (['released', 'refunded', 'failed', 'cancelled', 'expired'].includes(escrow.status)) {
      throw new BadRequestException(`Cannot move escrow from ${escrow.status} to held`);
    }
    escrow.status = 'held';
    escrow.heldAt = new Date();
    await escrow.save();
    try {
      await this.activityService.logActivity({
        userId: 'system',
        role: 'system',
        action: 'held',
        resource: 'escrow',
        resourceId: escrow.referenceId,
        metadata: { buyerId: escrow.buyerId, sellerId: escrow.sellerId, propertyId: escrow.propertyId },
      } as any);
    } catch {}
    return escrow;
  }

  async release(referenceId: string, requester?: any) {
    const escrow = await this.escrowModel.findOne({ referenceId }).exec();
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status === 'released') {
      // Idempotent no-op
      return escrow;
    }
    if (escrow.status !== 'held') {
      throw new BadRequestException('Only held escrows can be released');
    }
    const requesterId = String(requester?.sub ?? requester?.userId ?? '');
    const isSeller = requesterId && escrow.sellerId === requesterId;
    const isAdmin = ['admin', 'superadmin'].includes(requester?.role || '');
    if (!isSeller && !isAdmin) {
      throw new ForbiddenException('Only seller or admin can release escrow');
    }
    escrow.status = 'released';
    escrow.releasedAt = new Date();
    await escrow.save();
    try {
      await this.transactionModel.updateOne(
        { referenceId, type: 'property-payment' },
        { $set: { status: 'successful' } },
      ).exec();
    } catch {}
    try {
      this.events.emit('escrow.released', {
        referenceId,
        buyerId: escrow.buyerId,
        sellerId: escrow.sellerId,
        propertyId: escrow.propertyId,
        amount: escrow.amount,
        currency: escrow.currency,
      });
    } catch {}
    try {
      await this.activityService.logActivity({
        userId: String(requester?.sub || requester?.userId || ''),
        role: requester?.role || 'user',
        email: requester?.email,
        name: requester?.name,
        action: 'release',
        resource: 'escrow',
        resourceId: escrow.referenceId,
        metadata: { buyerId: escrow.buyerId, sellerId: escrow.sellerId, propertyId: escrow.propertyId },
        ip: requester?.ip,
        userAgent: requester?.userAgent,
      } as any);
    } catch {}

    // Fire-and-forget user-scoped activity logging (never crash release flow).
    try {
      void this.activityService
        .logUserActivity(
          escrow.sellerId,
          'escrow_released',
          'Escrow funds released',
          { escrowId: escrow.referenceId, amount: escrow.amount },
        )
        .catch(() => {});
    } catch {}

    // Notify both tenant and landlord about escrow release.
    try {
      void this.notificationsService
        .notifyEscrowUpdate(escrow.sellerId, escrow.referenceId, 'released')
        .catch(() => {});
    } catch {}
    try {
      void this.notificationsService
        .notifyEscrowUpdate(escrow.buyerId, escrow.referenceId, 'released')
        .catch(() => {});
    } catch {}

    return escrow;
  }

  /** Called by payment webhook when payment fails */
  async setFailedByReference(referenceId: string) {
    const escrow = await this.escrowModel.findOne({ referenceId }).exec();
    if (!escrow) return null;
    if (['released', 'refunded', 'held'].includes(escrow.status)) return escrow;
    escrow.status = 'failed';
    await escrow.save();
    try {
      void this.notificationsService
        .notifyEscrowUpdate(escrow.buyerId, escrow.referenceId, 'failed')
        .catch(() => {});
    } catch {}
    return escrow;
  }

  /** Buyer cancels escrow before payment completes (initiated only) */
  async cancel(referenceId: string, requester?: any) {
    const escrow = await this.escrowModel.findOne({ referenceId }).exec();
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status === 'cancelled') return escrow;
    if (!['initiated', 'pending_payment'].includes(escrow.status)) {
      throw new BadRequestException(`Cannot cancel escrow in status: ${escrow.status}`);
    }
    const requesterId = String(requester?.sub ?? requester?.userId ?? '');
    if (requesterId && escrow.buyerId !== requesterId) {
      throw new ForbiddenException('Only the buyer can cancel this escrow');
    }
    escrow.status = 'cancelled';
    await escrow.save();
    try {
      await this.activityService.logActivity({
        userId: requesterId,
        role: requester?.role || 'user',
        action: 'cancel',
        resource: 'escrow',
        resourceId: escrow.referenceId,
        metadata: { buyerId: escrow.buyerId },
      } as any);
    } catch {}
    return escrow;
  }

  async findByReference(referenceId: string) {
    const escrow = await this.escrowModel.findOne({ referenceId }).exec();
    if (!escrow) throw new NotFoundException('Escrow not found');
    return escrow;
  }

  async findByBuyer(buyerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.escrowModel.find({ buyerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.escrowModel.countDocuments({ buyerId }).exec(),
    ]);
    return { data, total };
  }

  async findBySeller(sellerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.escrowModel.find({ sellerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.escrowModel.countDocuments({ sellerId }).exec(),
    ]);
    return { data, total };
  }

  async refund(referenceId: string, requester?: any) {
    const escrow = await this.escrowModel.findOne({ referenceId }).exec();
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status === 'refunded') {
      // Idempotent no-op
      return escrow;
    }
    if (escrow.status !== 'held' && escrow.status !== 'initiated') {
      throw new BadRequestException('Only initiated or held escrows can be refunded');
    }
    const isAdmin = ['admin', 'superadmin'].includes(requester?.role || '');
    if (!isAdmin) {
      throw new ForbiddenException('Only admin can refund escrow');
    }
    escrow.status = 'refunded';
    escrow.refundedAt = new Date();
    await escrow.save();
    try {
      await this.transactionModel.updateOne(
        { referenceId, type: 'property-payment' },
        { $set: { status: 'failed' } },
      ).exec();
    } catch {}
    try {
      this.events.emit('escrow.refunded', {
        referenceId,
        buyerId: escrow.buyerId,
        sellerId: escrow.sellerId,
        propertyId: escrow.propertyId,
        amount: escrow.amount,
        currency: escrow.currency,
      });
    } catch {}
    try {
      await this.activityService.logActivity({
        userId: String(requester?.sub || requester?.userId || ''),
        role: requester?.role || 'user',
        email: requester?.email,
        name: requester?.name,
        action: 'refund',
        resource: 'escrow',
        resourceId: escrow.referenceId,
        metadata: { buyerId: escrow.buyerId, sellerId: escrow.sellerId, propertyId: escrow.propertyId },
        ip: requester?.ip,
        userAgent: requester?.userAgent,
      } as any);
    } catch {}

    // Notify both parties about escrow cancellation/refund.
    try {
      void this.notificationsService
        .notifyEscrowUpdate(escrow.sellerId, escrow.referenceId, 'cancelled')
        .catch(() => {});
    } catch {}
    try {
      void this.notificationsService
        .notifyEscrowUpdate(escrow.buyerId, escrow.referenceId, 'cancelled')
        .catch(() => {});
    } catch {}

    return escrow;
  }
}

