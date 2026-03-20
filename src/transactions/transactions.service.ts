import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './transaction.schema';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async listByUser(userId: string, filter: Partial<{ type: string; status: string }>) {
    const query: any = { userId };
    if (filter?.type) query.type = filter.type;
    if (filter?.status) query.status = filter.status;
    return this.transactionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Update transaction status with proper logging and metadata handling
   * @param referenceId - The transaction reference ID
   * @param status - The new status to set
   * @param meta - Optional metadata to merge with existing metadata
   */
  async updateTransactionStatus(referenceId: string, status: string, meta?: any): Promise<Transaction> {
    this.logger.log(`[TransactionService] Updating transaction ${referenceId} to status=${status}`);

    const tx = await this.transactionModel.findOne({ referenceId }).exec();
    if (!tx) {
      this.logger.error(`[TransactionService] Transaction not found: ${referenceId}`);
      throw new NotFoundException('Transaction not found');
    }

    // Update status
    tx.status = status as any; // Cast to any to bypass type error, or use as TransactionStatus if available
    
    // Merge metadata if provided
    if (meta) {
      tx.metadata = { ...tx.metadata, ...meta };
    }
    
    await tx.save();

    this.logger.log(`[TransactionService] Transaction updated: referenceId=${referenceId}, status=${tx.status}`);
    return tx;
  }

  /**
   * Get transaction by reference ID
   * @param referenceId - The transaction reference ID
   */
  async getTransactionByReference(referenceId: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({ referenceId }).exec();
  }

  /**
   * Create a new transaction
   * @param transactionData - Transaction data to create
   */
  async createTransaction(transactionData: any): Promise<Transaction> {
    this.logger.log(`[TransactionService] Creating transaction: referenceId=${transactionData.referenceId}, userId=${transactionData.userId}`);
    
    const transaction = new this.transactionModel(transactionData);
    const savedTransaction = await transaction.save();
    
    this.logger.log(`[TransactionService] Transaction created: referenceId=${savedTransaction.referenceId}, status=${savedTransaction.status}`);
    return savedTransaction;
  }

  /**
   * Create a pending transaction for wallet funding
   * @param userId - The user ID
   * @param amount - The transaction amount
   * @param referenceId - The transaction reference ID
   */
  async createPending(userId: string, amount: number, referenceId: string): Promise<Transaction> {
    this.logger.log(`[TransactionService] Creating pending transaction: userId=${userId}, amount=${amount}, referenceId=${referenceId}`);
    
    const transactionData = {
      userId,
      type: 'fund' as any,
      amount,
      currency: 'NGN',
      status: 'pending' as any,
      referenceId,
      metadata: {
        source: 'wallet_funding',
        createdAt: new Date()
      }
    };
    
    const transaction = new this.transactionModel(transactionData);
    const savedTransaction = await transaction.save();
    
    this.logger.log(`[TransactionService] Pending transaction created: referenceId=${savedTransaction.referenceId}, status=${savedTransaction.status}`);
    return savedTransaction;
  }

  /**
   * Mark a transaction as successful with proper status checking and logging
   * @param referenceId - The transaction reference ID
   * @param meta - Optional metadata to merge
   */
  async markAsSuccessful(referenceId: string, meta?: any): Promise<Transaction> {
    this.logger.log(`[TransactionService] Marking transaction as successful: ${referenceId}`);

    const tx = await this.transactionModel.findOne({ referenceId }).exec();
    if (!tx) {
      this.logger.error(`[TransactionService] Transaction not found: ${referenceId}`);
      throw new NotFoundException('Transaction not found');
    }

    if (tx.status === 'successful') {
      this.logger.log(`[TransactionService] Transaction already marked as successful: ${referenceId}`);
      return tx;
    }

    const oldStatus = tx.status;
    tx.status = 'successful' as any; // Cast to any to bypass type error
    
    // Merge metadata if provided
    if (meta) {
      tx.metadata = { ...tx.metadata, ...meta };
    }
    
    await tx.save();

    this.logger.log(`[TransactionService] Transaction updated: referenceId=${referenceId}, oldStatus=${oldStatus}, newStatus=successful`);
    return tx;
  }
}

