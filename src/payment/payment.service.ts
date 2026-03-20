import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schema/payment.schema';
import { PaymentLog, PaymentLogDocument } from './schema/payment-log.schema';
import { TransactionsService } from '../transactions/transactions.service';
import { ActivityService } from '../admin/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly flwSecretKey = process.env.FLW_SECRET_KEY;
  private readonly flwBaseUrl = process.env.FLW_BASE_URL;
  private readonly paymentRedirectUrl = process.env.PAYMENT_REDIRECT_URL;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentLog.name) private paymentLogModel: Model<PaymentLogDocument>,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    private activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {
    // Validate required environment variables
    if (!this.flwSecretKey) {
      this.logger.error('FLW_SECRET_KEY environment variable is not set');
    }
    if (!this.flwBaseUrl) {
      this.logger.error('FLW_BASE_URL environment variable is not set');
    }
  }

  async initiatePayment(data: any): Promise<any> {
    // Validate required fields
    if (!data.amount || !data.email || !data.name || !data.userId) {
      throw new Error('Missing required fields: amount, email, name, and userId are required');
    }

    // Create tx_ref with userId encoded: tx-{timestamp}-{userId}
    const timestamp = Date.now();
    const txRef = `tx-${timestamp}-${data.userId}`;

    const payload = {
      tx_ref: txRef,
      amount: data.amount,
      currency: 'NGN',
      redirect_url: this.paymentRedirectUrl || 'http://localhost:5173/payment/verify',
      customer: {
        email: data.email,
        name: data.name,
        phone_number: data.phone || '+2348000000000', // Default Nigerian number if not provided
      },
      customizations: {
        title: 'Wallet Funding',
        description: 'Payment for wallet funding',
      },
      meta: {
        internalUserId: data.userId, // Backup method to carry userId
      },
    };
  
    try {
      const res = await axios.post(`${this.flwBaseUrl}/payments`, payload, {
        headers: {
          Authorization: `Bearer ${this.flwSecretKey}`,
          'Content-Type': 'application/json',
          ...(data.headers || {}),
        },
      });
      // Log payment initiation
      await this.paymentLogModel.create({
        userId: data.userId, // Always use the internal userId
        amount: data.amount,
        currency: 'NGN',
        status: 'initiated',
        method: data.method || 'wallet_fund',
        reference: txRef,
        description: 'Payment initiated',
      });
      return res.data;
    } catch (error: any) {
      // Log payment initiation failure with detailed error info
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data || error.response || error;
      
      await this.paymentLogModel.create({
        userId: data.userId, // Always use the internal userId
        amount: data.amount,
        currency: 'NGN',
        status: 'failed',
        method: data.method || 'wallet_fund',
        reference: txRef,
        description: 'Payment initiation failed',
        error: errorMessage,
      });
      
      console.error('Payment error details:', {
        message: errorMessage,
        status: error.response?.status,
        data: errorDetails,
        payload: payload
      });
      
      throw new Error(`Failed to initiate payment: ${errorMessage}`);
    }
  }
  

  async verifyPayment(tx_ref: string): Promise<any> {
    try {
      // Extract userId from tx_ref format: tx-{timestamp}-{userId}
      const userId = this.extractUserIdFromTxRef(tx_ref);
      
      if (!userId) {
        throw new Error('Invalid tx_ref format: unable to extract userId');
      }

      const res = await axios.get(`${this.flwBaseUrl}/transactions/verify_by_reference?tx_ref=${tx_ref}`, {
        headers: {
          Authorization: `Bearer ${this.flwSecretKey}`,
        },
      });

      const flutterwaveResponse = res.data;
      const { tx_ref: responseTxRef, status, amount, currency, meta } = flutterwaveResponse.data;
      const amountValue = typeof amount === 'number' ? amount : Number(amount);
      const safeAmount = Number.isFinite(amountValue) ? amountValue : 0;

      this.logger.log(`[PaymentService] Verifying payment: tx_ref=${responseTxRef}, status=${status}, amount=${amount}`);

      // Update the existing payment log instead of creating a new one
      const existingLog = await this.paymentLogModel.findOne({ reference: tx_ref }).exec();
      
      if (existingLog) {
        // Update existing log with verification details
        existingLog.status = status;
        existingLog.description = 'Payment verified';
        await existingLog.save();
      } else {
        // Fallback: create new log if original not found
        await this.paymentLogModel.create({
          userId: userId,
          amount: amount,
          currency: currency,
          status: status,
          method: flutterwaveResponse.data?.payment_type || 'bank_transfer',
          reference: tx_ref,
          description: 'Payment verified',
        });
      }

      // Handle successful payment verification
      if (status === 'successful') {
        this.logger.log(`[PaymentService] Payment successful, marking transaction as successful for tx_ref=${tx_ref}`);
        
        try {
          // Update transaction status - wallet crediting will be handled by the wallet confirmation flow
          await this.transactionsService.markAsSuccessful(tx_ref, {
            ...meta,
            verifiedAt: new Date(),
            source: 'payment_verification'
          });

          this.logger.log(`[PaymentService] Transaction marked as successful for tx_ref=${tx_ref}`);

          // Fire-and-forget user-scoped activity logging.
          try {
            void this.activityService
              .logUserActivity(
                userId,
                'payment_success',
                `Payment of ${amount} completed`,
                { reference: tx_ref, amount: safeAmount },
              )
              .catch(() => {});
          } catch {}

          // Fire-and-forget notification push.
          try {
            void this.notificationsService
              .notifyPaymentSuccess(userId, safeAmount, tx_ref)
              .catch(() => {});
          } catch {}
        } catch (error: any) {
          this.logger.error(`[PaymentService] Error marking transaction as successful:`, error.message);
          // Don't throw here - payment was successful, just transaction update failed
        }
      } else {
        this.logger.warn(`[PaymentService] Payment not successful: tx_ref=${tx_ref}, status=${status}`);

        // Fire-and-forget user-scoped activity logging.
        try {
          void this.activityService
            .logUserActivity(
              userId,
              'payment_failed',
              `Payment of ${amount} failed`,
              { reference: tx_ref, amount: safeAmount },
            )
            .catch(() => {});
        } catch {}

        // Fire-and-forget notification push.
        try {
          void this.notificationsService
            .create({
              userId,
              type: NotificationType.PAYMENT_FAILED,
              title: 'Payment failed',
              body: `Payment of ${safeAmount} failed.`,
              metadata: { reference: tx_ref, amount: safeAmount },
            })
            .catch(() => {});
        } catch {}
      }

      // Log payment verification result
      this.logger.log(`[PaymentService] Payment verification completed for tx_ref=${tx_ref}, userId=${userId}, status=${status}`);

      // Add userId to the response for wallet service
      const responseData = res.data;
      if (responseData?.data) {
        responseData.data.internalUserId = userId;
      }
      
      return responseData;
    } catch (error: any) {
      // Log payment verification failure
      const userId = this.extractUserIdFromTxRef(tx_ref);
      if (userId) {
        try {
          void this.activityService
            .logUserActivity(
              userId,
              'payment_failed',
              'Payment failed',
              { reference: tx_ref },
            )
            .catch(() => {});
        } catch {}

        try {
          void this.notificationsService
            .create({
              userId,
              type: NotificationType.PAYMENT_FAILED,
              title: 'Payment failed',
              body: 'Payment verification failed.',
              metadata: { reference: tx_ref },
            })
            .catch(() => {});
        } catch {}
      }
      
      await this.paymentLogModel.create({
        userId: userId || 'unknown',
        amount: undefined,
        currency: undefined,
        status: 'verification_failed',
        method: 'unknown',
        reference: tx_ref,
        description: 'Payment verification failed',
        error: error.response?.data?.message || error.message,
      });
      
      this.logger.error('Verification error:', error.response?.data || error.message);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * Extract userId from tx_ref format: tx-{timestamp}-{userId}
   */
  private extractUserIdFromTxRef(tx_ref: string): string | null {
    try {
      const parts = tx_ref.split('-');
      if (parts.length >= 3) {
        // Join all parts after the second dash to handle userIds with dashes
        return parts.slice(2).join('-');
      }
      return null;
    } catch (error) {
      console.error('Error extracting userId from tx_ref:', error);
      return null;
    }
  }

  async savePayment(paymentData: any): Promise<Payment> {
    const payment = new this.paymentModel(paymentData);
    return await payment.save();
  }
  
    
}
