import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallet, WalletSchema } from './wallet.schema';
import { Transaction, TransactionSchema } from '../transactions/transaction.schema';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PaymentModule } from '../payment/payment.module';
import { PaymentLog, PaymentLogSchema } from '../payment/schema/payment-log.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    TransactionsModule,
    UsersModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: PaymentLog.name, schema: PaymentLogSchema },
    ]),
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}

