import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanFilterDto } from './dto/loan-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply for a micro-loan' })
  @ApiResponse({ status: 201, description: 'Loan application created' })
  async apply(@Body() dto: CreateLoanDto) {
    return this.loansService.apply(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List loans (admin or filter by user)' })
  @ApiResponse({ status: 200, description: 'List of loans' })
  async findAll(@Query() filters: LoanFilterDto) {
    return this.loansService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Loan stats' })
  async stats() {
    return this.loansService.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan by id' })
  async findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }
}
