import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from './schema/payment.schema';
import { PaymentLog, PaymentLogSchema } from './schema/payment-log.schema';
import { Transaction, TransactionSchema } from '../transactions/transaction.schema';
import { Wallet, WalletSchema } from '../wallet/wallet.schema';
import { forwardRef } from '@nestjs/common';
import { EscrowModule } from '../escrow/escrow.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentLog.name, schema: PaymentLogSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    forwardRef(() => EscrowModule),
    forwardRef(() => TransactionsModule),
    AdminModule,
    NotificationsModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
