import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { CreateClaimDto } from './dto/create-claim.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('products')
  @ApiOperation({ summary: 'List insurance products' })
  async products() {
    return this.insuranceService.listProducts();
  }

  @Post('policy')
  @ApiOperation({ summary: 'Create a policy' })
  async createPolicy(@Body() dto: CreatePolicyDto) {
    return this.insuranceService.createPolicy(dto);
  }

  @Get('policies')
  @ApiOperation({ summary: 'List policies (optionally by user)' })
  async policies(@Query('userId') userId: string) {
    return this.insuranceService.listPolicies(userId);
  }

  @Post('claim')
  @ApiOperation({ summary: 'Submit an insurance claim' })
  async claim(@Body() dto: CreateClaimDto) {
    return this.insuranceService.applyClaim(dto);
  }

  @Get('claims')
  @ApiOperation({ summary: 'List claims (optionally by user)' })
  async claims(@Query('userId') userId: string) {
    return this.insuranceService.listClaims(userId);
  }
}
