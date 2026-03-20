import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Escrow, EscrowSchema } from './escrow.schema';
import { Transaction, TransactionSchema } from '../transactions/transaction.schema';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { PaymentModule } from '../payment/payment.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
  forwardRef(() => PaymentModule),
    AdminModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Escrow.name, schema: EscrowSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [EscrowService],
  controllers: [EscrowController],
  exports: [EscrowService],
})
export class EscrowModule {}

