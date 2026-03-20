import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Req,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { Property } from './property.schema';
import { isValidObjectId } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRolesGuard } from '../admin/admin-roles.guard';
import { AdminRole } from '../admin/admin-role.decorator';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { uploadConfig } from '../config/upload.config';
import { Express } from 'express';
import { PropertyFilterDto } from './dto/property-filter.dto';

@ApiTags('Property')
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a property (landlord/agent only)' })
  @UseInterceptors(AnyFilesInterceptor(uploadConfig))
  async createProperty(
    @Req() req: any,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('User not found in token');

    let propertyData: Partial<Property>;
    const payloadField = body?.payload;
    if (typeof payloadField === 'string' && payloadField.trim().length > 0) {
      try {
        propertyData = JSON.parse(payloadField);
      } catch {
        throw new BadRequestException('Invalid payload format: payload is not valid JSON');
      }
    } else if (body && Object.keys(body).length > 0) {
      propertyData = body;
    } else {
      throw new BadRequestException('Invalid payload format: no payload provided');
    }

    return this.propertyService.createProperty(propertyData, userId, files);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get property stats (admin)' })
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  @ApiBearerAuth()
  async getStats() {
    return this.propertyService.getStats();
  }

  @Get('landlord/:landlordId')
  @ApiOperation({ summary: 'Get properties by landlord' })
  async getPropertiesByLandlord(@Param('landlordId') landlordId: string) {
    return this.propertyService.getPropertiesByLandlord(landlordId);
  }

  @Get()
  @ApiOperation({ summary: 'List properties with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated properties' })
  async getProperties(@Query() filters: PropertyFilterDto) {
    if (filters.status || filters.type || filters.landlordId || filters.page || filters.limit) {
      return this.propertyService.findAll(filters);
    }
    return this.propertyService.getAllProperties();
  }

  @Put(':id/verify')
  @ApiOperation({ summary: 'Verify property (admin)' })
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  @ApiBearerAuth()
  async verify(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid Property ID');
    return this.propertyService.verify(id);
  }

  @Put(':id/flag')
  @ApiOperation({ summary: 'Flag property (admin)' })
  @UseGuards(JwtAuthGuard, AdminRolesGuard)
  @AdminRole('admin')
  @ApiBearerAuth()
  async flag(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid Property ID');
    return this.propertyService.flag(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property by ID' })
  async getPropertyById(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid Property ID');
    return this.propertyService.getPropertyById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property' })
  async updateProperty(
    @Param('id') id: string,
    @Body() propertyData: Partial<Property>,
  ) {
    return this.propertyService.updateProperty(id, propertyData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete property' })
  async deleteProperty(@Param('id') id: string) {
    return this.propertyService.deleteProperty(id);
  }
}