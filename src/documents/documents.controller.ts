import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../common/get-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/role.decorator';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { documentsMulterConfig } from './documents.multer';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        userId: { type: 'string' },
        type: { type: 'string' },
        label: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
      },
      required: ['file', 'userId', 'type', 'label'],
    },
  })
  @UseInterceptors(FileInterceptor('file', documentsMulterConfig))
  @ApiOperation({ summary: 'Upload a KYC document' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @GetUser() user: any,
  ) {
    const currentUserId = user?.userId ?? user?.sub ?? user?._id;
    if (!currentUserId) throw new BadRequestException('User not found in token');
    return this.documentsService.upload(String(currentUserId), dto, file);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my documents' })
  @ApiResponse({ status: 200, description: 'Documents list' })
  async me(
    @GetUser() user: any,
    @Query() filters: DocumentFilterDto,
  ) {
    const currentUserId = user?.userId ?? user?.sub ?? user?._id;
    return this.documentsService.findByUser(String(currentUserId), filters);
  }

  @Get('kyc-status')
  @ApiOperation({ summary: 'Get my KYC status' })
  @ApiResponse({ status: 200, description: 'KYC status' })
  async kycStatus(@GetUser() user: any) {
    const currentUserId = user?.userId ?? user?.sub ?? user?._id;
    return this.documentsService.getKycStatus(String(currentUserId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by id (own only)' })
  @ApiResponse({ status: 200, description: 'Document record' })
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    const currentUserId = user?.userId ?? user?.sub ?? user?._id;
    return this.documentsService.findOne(id, String(currentUserId));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a document (own only)' })
  @ApiResponse({ status: 204, description: 'Document deleted' })
  async remove(@Param('id') id: string, @GetUser() user: any): Promise<void> {
    const currentUserId = user?.userId ?? user?.sub ?? user?._id;
    await this.documentsService.remove(id, String(currentUserId));
  }

  @Put(':id/verify')
  @ApiOperation({ summary: 'Admin verify/reject a document' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @GetUser() admin: any,
  ) {
    const adminId = admin?.userId ?? admin?.sub ?? admin?._id;
    if (!adminId) throw new BadRequestException('Admin not found in token');
    return this.documentsService.verify(id, dto, String(adminId));
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin view of all documents' })
  @ApiResponse({ status: 200, description: 'Documents list' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Role('admin')
  async adminAll(@Query() filters: DocumentFilterDto) {
    return this.documentsService.findByUser(undefined, filters);
  }
}

