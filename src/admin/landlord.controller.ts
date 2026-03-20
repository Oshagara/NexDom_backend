import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LandlordService } from './landlord.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRolesGuard } from './admin-roles.guard';
import { AdminRole } from './admin-role.decorator';

@Controller('private/landlord')
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  // List landlords (superadmin only)
  @Get()
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async listLandlords(@Query() query: any) {
    return this.landlordService.getAllLandlords(query);
  }

  // Get landlord profile (admin or superadmin)
  @Get(':landlordId')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  async getProfile(@Param('landlordId') landlordId: string) {
    return this.landlordService.getLandlordProfile(landlordId);
  }

  // Get landlord detailed profile (superadmin only)
  @Get(':landlordId/details')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async getDetailedProfile(@Param('landlordId') landlordId: string) {
    return this.landlordService.getLandlordProfileDetailed(landlordId);
  }

  // Landlord stats (superadmin only)
  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('superadmin')
  async getStats() {
    return this.landlordService.getLandlordStats();
  }
}