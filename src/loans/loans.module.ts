import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Loan, LoanSchema } from './schemas/loan.schema';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Loan.name, schema: LoanSchema }])],
  providers: [LoansService],
  controllers: [LoansController],
  exports: [LoansService],
})
export class LoansModule {}
