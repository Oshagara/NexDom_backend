import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MortgageService } from './mortgage.service';
import { MortgageController } from './mortgage.controller';
import { BankPartner, BankPartnerSchema } from './schemas/bank-partner.schema';
import { MortgageReferral, MortgageReferralSchema } from './schemas/referral.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankPartner.name, schema: BankPartnerSchema },
      { name: MortgageReferral.name, schema: MortgageReferralSchema },
    ]),
    NotificationsModule,
  ],
  providers: [MortgageService],
  controllers: [MortgageController],
  exports: [MortgageService],
})
export class MortgageModule {}
