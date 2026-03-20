import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './wallet.schema';
import { Transaction, TransactionDocument } from '../transactions/transaction.schema';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { PaymentService } from '../payment/payment.service';
import { InjectModel as InjectMongooseModel } from '@nestjs/mongoose';
import { PaymentLog, PaymentLogDocument } from '../payment/schema/payment-log.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    private paymentService: PaymentService,
    @InjectMongooseModel(PaymentLog.name) private paymentLogModel: Model<PaymentLogDocument>,
    private transactionsService: TransactionsService,
    private usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOrCreateWallet(userId: string, currency: 'NGN' = 'NGN') {
    let wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) {
      wallet = await this.walletModel.create({ userId, currency, balance: 0 });
    }
    return wallet;
  }

  /**
   * Secure wallet funding method that prevents frontend from passing sensitive data
   * @param userId - Extracted from JWT token
   * @param dto - Only contains amount
   */
  async fundWallet(userId: string, dto: FundWalletDto) {
    this.logger.log(`[WalletService] Starting secure wallet funding: userId=${userId}, amount=${dto.amount}`);

    try {
      // Step 1: Fetch user details from database (never trust frontend)
      this.logger.log(`[WalletService] Fetching user details from database: userId=${userId}`);
      const user = await this.usersService.getUserById(userId);
      
      if (!user) {
        this.logger.error(`[WalletService] User not found: userId=${userId}`);
        throw new NotFoundException('User not found');
      }

      this.logger.log(`[WalletService] User details fetched: email=${(user as any).email}, name=${(user as any).name}`);

      // Step 2: Get or create wallet
      const wallet = await this.getOrCreateWallet(userId, 'NGN');
      this.logger.log(`[WalletService] Wallet ready: userId=${userId}, currency=${wallet.currency}`);

      // Step 3: Generate unique tx_ref as tx-{timestamp}-{userId}
      const timestamp = Date.now();
      const tx_ref = `tx-${timestamp}-${userId}`;
      this.logger.log(`[WalletService] Generated transaction reference: ${tx_ref}`);

      // Step 4: Save pending transaction
      this.logger.log(`[WalletService] Creating pending transaction: referenceId=${tx_ref}`);
      await this.transactionsService.createPending(userId, dto.amount, tx_ref);
      this.logger.log(`[WalletService] Pending transaction saved successfully`);

      // Step 5: Call Flutterwave API to initialize payment
      this.logger.log(`[WalletService] Initializing Flutterwave payment: amount=${dto.amount}, tx_ref=${tx_ref}`);
      
      const paymentData = {
        amount: dto.amount,
        email: (user as any).email,
        name: (user as any).name,
        phone: '+2348000000000', // Default Nigerian number since phone field doesn't exist in User schema
        userId: userId,
        method: 'wallet_fund',
        headers: { 'Idempotency-Key': `fund-${userId}-${dto.amount}-${timestamp}` },
      };

      const flutterwaveResponse = await this.paymentService.initiatePayment(paymentData);
      this.logger.log(`[WalletService] Flutterwave payment initialized successfully: tx_ref=${tx_ref}`);

      // Step 6: Return payment link to frontend
      const paymentLink = flutterwaveResponse?.data?.link || flutterwaveResponse?.data?.data?.link;
      
      if (!paymentLink) {
        this.logger.error(`[WalletService] No payment link received from Flutterwave: ${JSON.stringify(flutterwaveResponse)}`);
        throw new BadRequestException('Failed to generate payment link');
      }

      this.logger.log(`[WalletService] Wallet funding process completed successfully: userId=${userId}, paymentLink=${paymentLink}`);
      
      return {
        success: true,
        payment_link: paymentLink,
        tx_ref: tx_ref,
        amount: dto.amount,
        currency: 'NGN',
        message: 'Payment link generated successfully'
      };

    } catch (error: any) {
      this.logger.error(`[WalletService] Error in wallet funding process: userId=${userId}, error=${error.message}`);
      
      // Log the error details for debugging
      this.logger.error(`[WalletService] Error details:`, {
        userId,
        amount: dto.amount,
        error: error.message,
        stack: error.stack
      });

      throw new BadRequestException(`Wallet funding failed: ${error.message}`);
    }
  }

  /**
   * Credit a user's wallet with the specified amount
   * @param userId - The user ID whose wallet to credit
   * @param amount - The amount to credit to the wallet
   * @param meta - Optional metadata for the transaction
   */
  async credit(userId: string, amount: number, meta: any) {
    this.logger.log(`[WalletService] Crediting wallet: userId=${userId}, amount=${amount}`);
  
    const wallet = await this.walletModel.findOne({ userId });
    if (!wallet) {
      this.logger.error(`[WalletService] Wallet not found for userId=${userId}`);
      throw new NotFoundException('Wallet not found');
    }
  
    const oldBalance = wallet.balance;
    wallet.balance += amount;
    await wallet.save();
  
    this.logger.log(`[WalletService] Wallet updated: userId=${userId}, oldBalance=${oldBalance}, newBalance=${wallet.balance}`);
    return {
      wallet,
      oldBalance,
      newBalance: wallet.balance,
      message: `Wallet credited successfully with ${amount} NGN`
    };
  }
  

  /**
   * Mark a transaction as successful using TransactionsService
   * @param referenceId - The transaction reference ID
   * @param options - Additional options including userId
   */
  async markTransactionSuccessful(referenceId: string, options: { userId: string }): Promise<Transaction> {
    try {
      const transaction = await this.transactionsService.markAsSuccessful(
        referenceId, 
        { 
          updatedBy: options.userId,
          updatedAt: new Date(),
          source: 'wallet_service'
        }
      );

      console.log(`[WalletService] Transaction ${referenceId} marked successful for userId=${options.userId}`);
      return transaction;
    } catch (error: any) {
      console.error(`[WalletService] Error marking transaction successful:`, error.message);
      throw error;
    }
  }


  async confirmFunding(referenceId: string, userId?: string) {
    try {
      // Verify payment with Flutterwave
      const verification = await this.paymentService.verifyPayment(referenceId);
      const status = verification?.data?.status || verification?.status;
      
      // Get the correct userId from the verification response (extracted from tx_ref)
      const correctUserId = verification?.data?.internalUserId;
      
      if (!correctUserId) {
        throw new BadRequestException('Unable to determine user from transaction reference');
      }

      // Find the original transaction using the TransactionsService
      const transaction = await this.transactionsService.getTransactionByReference(referenceId);
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Only proceed if payment was successful
      if (status === 'successful' || status === 'success') {
        // Mark transaction as successful
        await this.markTransactionSuccessful(referenceId, { userId: correctUserId });
        
        // Credit the wallet using the new credit method
        const creditResult = await this.credit(correctUserId, transaction.amount, {
          reference: referenceId,
          description: 'Wallet funded successfully'
        });
        
        console.log(`[WalletService] Payment confirmed and wallet credited for user ${correctUserId}`);

        // Notify wallet funding success (never crash confirmation flow).
        try {
          void this.notificationsService
            .create({
              userId: String(correctUserId),
              type: NotificationType.PAYMENT_SUCCESS,
              title: 'Wallet funded',
              body: `Wallet funded with ${transaction.amount}`,
              metadata: { reference: referenceId, amount: transaction.amount },
            })
            .catch(() => {});
        } catch {}
        
        return { 
          status: 'successful',
          userId: correctUserId,
          amount: transaction.amount,
          newBalance: creditResult.newBalance,
          message: creditResult.message
        };
      } else {
        // Mark transaction as failed using TransactionsService
        await this.transactionsService.updateTransactionStatus(
          referenceId, 
          'failed', 
          { 
            reason: status,
            updatedAt: new Date()
          }
        );
        
        console.log(`[WalletService] Payment failed for user ${correctUserId}: ${status}`);
        return { 
          status: 'failed',
          userId: correctUserId,
          reason: status
        };
      }
    } catch (error: any) {
      console.error('[WalletService] Error confirming funding:', error);
      throw new BadRequestException(`Failed to confirm funding: ${error.message}`);
    }
  }

  async requestWithdrawal(dto: WithdrawDto) {
    const wallet = await this.getOrCreateWallet(dto.userId);
    if (dto.amount > wallet.balance) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const referenceId = `wd-${Date.now()}`;
    await this.transactionsService.createTransaction({
      userId: dto.userId,
      type: 'withdraw',
      amount: dto.amount,
      currency: wallet.currency,
      status: 'pending',
      referenceId,
      metadata: { 
        bankCode: dto.bankCode, 
        accountNumber: dto.accountNumber, 
        accountName: dto.accountName,
        source: 'withdrawal_request'
      },
    });

    const payload = {
      account_bank: dto.bankCode,
      account_number: dto.accountNumber,
      amount: dto.amount,
      currency: wallet.currency,
      narration: 'Wallet withdrawal',
      reference: referenceId,
      debit_subaccount: null,
    };

    try {
      const res = await (await import('axios')).default.post(`${process.env.FLW_BASE_URL}/transfers`, payload, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, 'Idempotency-Key': `wd-${dto.userId}-${dto.amount}-${dto.accountNumber}` },
      });
      await this.paymentLogModel.create({
        userId: dto.userId,
        amount: dto.amount,
        currency: wallet.currency,
        status: 'initiated',
        method: 'transfer',
        reference: referenceId,
        description: 'Withdrawal initiated',
      });
      return res.data;
    } catch (error: any) {
      await this.paymentLogModel.create({
        userId: dto.userId,
        amount: dto.amount,
        currency: wallet.currency,
        status: 'failed',
        method: 'transfer',
        reference: referenceId,
        description: 'Withdrawal initiation failed',
        error: error.response?.data?.message || error.message,
      });
      throw new BadRequestException(error.response?.data || error.message);
    }
  }

  async handleTransferWebhook(event: any) {
    const referenceId = event?.data?.reference || event?.data?.tx_ref;
    if (!referenceId) return;
    
    const transaction = await this.transactionsService.getTransactionByReference(referenceId);
    if (!transaction) return;

    if (event?.data?.status === 'SUCCESSFUL' || event?.data?.status === 'successful') {
      // Use markAsSuccessful for successful transfers
      await this.transactionsService.markAsSuccessful(
        referenceId, 
        { 
          webhookData: event?.data,
          updatedAt: new Date(),
          source: 'transfer_webhook'
        }
      );
      
      if (transaction.type === 'withdraw') {
        const wallet = await this.getOrCreateWallet(transaction.userId);
        wallet.balance -= transaction.amount;
        await wallet.save();

        // Notify withdrawal processed (never crash webhook flow).
        try {
          void this.notificationsService
            .create({
              userId: String(transaction.userId),
              type: NotificationType.SYSTEM,
              title: 'Withdrawal processed',
              body: `Withdrawal of ${transaction.amount} processed`,
              metadata: { reference: referenceId, amount: transaction.amount },
            })
            .catch(() => {});
        } catch {}
      }
    } else if (event?.data?.status === 'FAILED') {
      await this.transactionsService.updateTransactionStatus(
        referenceId, 
        'failed', 
        { 
          webhookData: event?.data,
          updatedAt: new Date(),
          source: 'transfer_webhook'
        }
      );
    }
  }

  async getWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await this.transactionModel.find({ userId }).sort({ createdAt: -1 }).exec();
    return { balance: wallet.balance, currency: wallet.currency, transactions };
  }
}

