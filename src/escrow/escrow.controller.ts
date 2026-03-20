import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EscrowService } from './escrow.service';
import { InitiateEscrowDto } from './dto/initiate-escrow.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Escrow')
@ApiBearerAuth()
@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private escrowService: EscrowService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate escrow (creates payment link)' })
  initiate(@Body() dto: InitiateEscrowDto) {
    return this.escrowService.initiate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List escrows for current user (buyer or seller)' })
  async list(
    @Query('role') role?: 'buyer' | 'seller',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const userId = String(req?.user?.sub ?? req?.user?.userId ?? '');
    if (role === 'seller') {
      return this.escrowService.findBySeller(
        userId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
      );
    }
    return this.escrowService.findByBuyer(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':referenceId')
  @ApiOperation({ summary: 'Get escrow by reference ID' })
  getByReference(@Param('referenceId') ref: string) {
    return this.escrowService.findByReference(ref);
  }

  @Post(':referenceId/release')
  @ApiOperation({ summary: 'Release funds to seller (seller or admin)' })
  release(@Param('referenceId') ref: string, @Req() req: any) {
    return this.escrowService.release(ref, req.user);
  }

  @Post(':referenceId/refund')
  @ApiOperation({ summary: 'Refund to buyer (admin only)' })
  refund(@Param('referenceId') ref: string, @Req() req: any) {
    return this.escrowService.refund(ref, req.user);
  }

  @Post(':referenceId/cancel')
  @ApiOperation({ summary: 'Cancel escrow before payment (buyer only)' })
  cancel(@Param('referenceId') ref: string, @Req() req: any) {
    return this.escrowService.cancel(ref, req.user);
  }
}

