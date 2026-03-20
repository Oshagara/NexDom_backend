import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get(':userId')
  list(@Param('userId') userId: string, @Query() query: QueryTransactionsDto) {
    return this.transactionsService.listByUser(userId, query);
  }
}

