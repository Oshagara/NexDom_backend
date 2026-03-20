import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MortgageService } from './mortgage.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Mortgage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mortgage')
export class MortgageController {
  constructor(private readonly mortgageService: MortgageService) {}

  @Get('partners')
  @ApiOperation({ summary: 'List bank partners' })
  async partners() {
    return this.mortgageService.listPartners();
  }

  @Get('partners/:id')
  @ApiOperation({ summary: 'Get a bank partner' })
  async partner(@Param('id') id: string) {
    return this.mortgageService.getPartner(id);
  }

  @Post('referral')
  @ApiOperation({ summary: 'Submit mortgage referral' })
  async refer(@Body() dto: CreateReferralDto) {
    return this.mortgageService.createReferral(dto);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'List mortgage referrals (optionally by user)' })
  async referrals(@Query('userId') userId?: string) {
    return this.mortgageService.listReferrals(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Mortgage stats' })
  async stats() {
    return this.mortgageService.stats();
  }
}
