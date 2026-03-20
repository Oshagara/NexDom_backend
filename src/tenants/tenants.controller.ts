import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/get-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tenant profile' })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async create(@Body() dto: CreateTenantDto, @GetUser() user: { userId?: string; sub?: string }) {
    const userId = user?.userId ?? user?.sub;
    return this.tenantsService.create(dto, String(userId));
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants (paginated)' })
  @ApiResponse({ status: 200, description: 'List of tenants' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('landlordId') landlordId?: string,
    @GetUser() user?: { userId?: string; sub?: string; role?: string },
  ) {
    if (landlordId) {
      return this.tenantsService.findByLandlord(
        landlordId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
      );
    }
    return this.tenantsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant details' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant info' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @GetUser() user: { userId?: string; sub?: string; role?: string },
  ) {
    const userSub = user?.sub ?? user?.userId ?? ''; // Use sub (User._id) for landlord ref
    const role = user?.role ?? 'user';
    return this.tenantsService.update(id, dto, String(userSub), role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant (admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant deleted' })
  @ApiResponse({ status: 403, description: 'Admin only' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(
    @Param('id') id: string,
    @GetUser() user: { userId?: string; sub?: string; role?: string },
  ) {
    const role = user?.role ?? 'user';
    await this.tenantsService.remove(id, role);
  }
}
