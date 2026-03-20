import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InsuranceService } from './insurance.service';
import { InsuranceController } from './insurance.controller';
import { InsuranceProduct, InsuranceProductSchema } from './schemas/product.schema';
import { InsurancePolicy, InsurancePolicySchema } from './schemas/policy.schema';
import { InsuranceClaim, InsuranceClaimSchema } from './schemas/claim.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InsuranceProduct.name, schema: InsuranceProductSchema },
      { name: InsurancePolicy.name, schema: InsurancePolicySchema },
      { name: InsuranceClaim.name, schema: InsuranceClaimSchema },
    ]),
    NotificationsModule,
  ],
  providers: [InsuranceService],
  controllers: [InsuranceController],
  exports: [InsuranceService],
})
export class InsuranceModule {}
