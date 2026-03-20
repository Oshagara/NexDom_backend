import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceFilterDto } from './dto/maintenance-filter.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/get-user.decorator';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a maintenance request' })
  @ApiResponse({ status: 201, description: 'Maintenance request created' })
  async create(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List maintenance requests with filters' })
  @ApiResponse({ status: 200, description: 'Paginated maintenance requests' })
  async findAll(@Query() filters: MaintenanceFilterDto) {
    return this.maintenanceService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance stats for landlord' })
  @ApiResponse({ status: 200, description: 'Maintenance statistics' })
  async getStats(@Query('landlordId') landlordId: string) {
    return this.maintenanceService.getStats(landlordId);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get maintenance requests for a tenant' })
  @ApiResponse({ status: 200, description: 'List of tenant maintenance requests' })
  async findByTenant(@Param('tenantId') tenantId: string) {
    return this.maintenanceService.findByTenant(tenantId);
  }

  @Get('landlord/:landlordId')
  @ApiOperation({ summary: 'Get maintenance requests for a landlord' })
  @ApiResponse({ status: 200, description: 'List of landlord maintenance requests' })
  async findByLandlord(@Param('landlordId') landlordId: string) {
    return this.maintenanceService.findByLandlord(landlordId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a maintenance request by id' })
  @ApiResponse({ status: 200, description: 'Maintenance request found' })
  async findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a maintenance request' })
  @ApiResponse({ status: 200, description: 'Updated maintenance request' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
    @GetUser() user: any,
  ) {
    const userId = user?.userId ?? user?.sub ?? user?._id ?? null;
    if (!userId) {
      throw new NotFoundException('User not found in token');
    }
    return this.maintenanceService.update(id, dto, String(userId));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a maintenance request' })
  @ApiResponse({ status: 204, description: 'Maintenance request closed' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.maintenanceService.remove(id);
  }
}

