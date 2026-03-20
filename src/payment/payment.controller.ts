import { Controller, Post, Body, Get, Query, Headers, HttpCode, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentLog, PaymentLogDocument } from './schema/payment-log.schema';
import { InjectModel as InjectMModel } from '@nestjs/mongoose';
import { Transaction, TransactionDocument } from '../transactions/transaction.schema';
import { Wallet, WalletDocument } from '../wallet/wallet.schema';
import { EscrowService } from '../escrow/escrow.service';
import { TransactionsService } from '../transactions/transactions.service';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    @InjectModel(PaymentLog.name) private paymentLogModel: Model<PaymentLogDocument>,
    @InjectMModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectMModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private escrowService: EscrowService,
    private transactionsService: TransactionsService,
  ) {}

  @Post('initiate')
  async initiatePayment(@Body() body: any) {
    return this.paymentService.initiatePayment(body);
  }

  @Get('verify')
  async verifyPayment(@Query('tx_ref') tx_ref: string) {
    return this.paymentService.verifyPayment(tx_ref);
  }

  @Post('process')
  async processPayment(@Body() flutterwaveResponse: any) {
    const paymentData = {
      tx_ref: flutterwaveResponse.tx_ref,
      amount: flutterwaveResponse.amount,
      currency: flutterwaveResponse.currency,
      email: flutterwaveResponse.customer.email,
      name: flutterwaveResponse.customer.name,
      status: flutterwaveResponse.status,
      flw_ref: flutterwaveResponse.flw_ref,
    };

    const savedPayment = await this.paymentService.savePayment(paymentData);

    return { message: 'Payment processed and email sent!', data: savedPayment };
  }

  // Flutterwave webhook to confirm events and update records
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() event: any, @Headers('verif-hash') signature: string) {
    const secretHash = process.env.FLW_WEBHOOK_HASH;
    if (secretHash && signature !== secretHash) {
      this.logger.warn('Webhook signature verification failed');
      return { status: 'ignored' };
    }

    const eventType = event?.event || event?.data?.status;
    const referenceId = event?.data?.tx_ref || event?.data?.reference;
    
    this.logger.log(`[PaymentController] Webhook received: eventType=${eventType}, referenceId=${referenceId}`);

    if (referenceId) {
      try {
        const tx = await this.transactionsService.getTransactionByReference(referenceId);
        if (tx) {
          if (eventType === 'charge.completed' || event?.data?.status === 'successful') {
            this.logger.log(`[PaymentController] Processing successful payment webhook for referenceId=${referenceId}`);
            
            // Use markAsSuccessful for consistent transaction handling
            await this.transactionsService.markAsSuccessful(referenceId, {
              webhookEvent: event,
              processedAt: new Date(),
              source: 'flutterwave_webhook'
            });

            if (tx.type === 'fund') {
              // Credit wallet directly (to avoid circular dependency)
              const wallet = await this.walletModel.findOne({ userId: tx.userId }).exec();
              if (wallet) {
                wallet.balance += tx.amount;
                await wallet.save();
                this.logger.log(`[PaymentController] Wallet credited via webhook for userId=${tx.userId}, amount=${tx.amount}, newBalance=${wallet.balance}`);
              } else {
                this.logger.error(`[PaymentController] Wallet not found for userId=${tx.userId}`);
              }
            } else if (tx.type === 'property-payment') {
              await this.escrowService.setHeldByReference(referenceId);
            }
          } else if (event?.data?.status === 'failed') {
            this.logger.warn(`[PaymentController] Payment failed for referenceId=${referenceId}`);
            await this.transactionsService.updateTransactionStatus(referenceId, 'failed', {
              webhookEvent: event,
              processedAt: new Date(),
              source: 'flutterwave_webhook'
            });
            if (tx.type === 'property-payment') {
              try {
                await this.escrowService.setFailedByReference(referenceId);
              } catch (e: any) {
                this.logger.warn(`[PaymentController] Failed to set escrow failed: ${e?.message}`);
              }
            }
          }
        } else {
          this.logger.warn(`[PaymentController] Transaction not found for referenceId=${referenceId}`);
        }
      } catch (error: any) {
        this.logger.error(`[PaymentController] Error processing webhook for referenceId=${referenceId}:`, error.message);
      }
    }
    
    return { status: 'ok' };
  }

  @Get('logs')
  async getPaymentLogs(@Query() query: any) {
    // Basic filtering and pagination
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const filter: any = {};
    if (query.userId) filter.userId = query.userId;
    if (query.status) filter.status = query.status;
    if (query.method) filter.method = query.method;
    if (query.reference) filter.reference = query.reference;
    const logs = await this.paymentLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.paymentLogModel.countDocuments(filter);
    return {
      page,
      limit,
      total,
      logs,
    };
  }
}
