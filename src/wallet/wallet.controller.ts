import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Post('fund')
  fund(@Body() dto: FundWalletDto, @Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.walletService.fundWallet(userId, dto);
  }

  @Post('withdraw')
  withdraw(@Body() dto: WithdrawDto, @Req() req: any) {
    if (req.user?.userId && !dto.userId) dto.userId = req.user.userId;
    return this.walletService.requestWithdrawal(dto);
  }

  @Get(':userId')
  getWallet(@Param('userId') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Post('confirm/:referenceId')
  confirmFunding(@Param('referenceId') referenceId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.walletService.confirmFunding(referenceId, userId);
  }
}

