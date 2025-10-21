import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PoliciesService } from '../services/policies.service';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';
import { PolicyResponseDto } from '../dto/policy-response.dto';
import { PublishPolicyDto } from '../dto/publish-policy.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Cache } from '../../../common/decorators/cache.decorator';
import { CacheInterceptor } from '../../../common/interceptors/cache.interceptor';

@ApiTags('Policies')
@Controller('policies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new policy' })
  @ApiResponse({
    status: 201,
    description: 'Policy created successfully',
    type: PolicyResponseDto,
  })
  async create(
    @Body() createPolicyDto: CreatePolicyDto,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    return this.policiesService.create(createPolicyDto, user.userId);
  }

  @Post('with-pdf')
  @UseInterceptors(FileInterceptor('pdf', {
    storage: memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  @ApiOperation({ summary: 'Create a new policy with PDF upload and processing' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Policy created successfully with PDF processing',
    type: PolicyResponseDto,
  })
  async createWithPDF(
    @UploadedFile() pdf: Express.Multer.File,
    @Body() policyData: any,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    // Debug logging
    console.log('Backend received policyData:', policyData);
    console.log('Backend received pdf:', pdf?.originalname);
    console.log('PDF file object:', {
      originalname: pdf?.originalname,
      mimetype: pdf?.mimetype,
      size: pdf?.size,
      buffer: pdf?.buffer ? 'Buffer exists' : 'No buffer',
      path: pdf?.path || 'No path'
    });
    
    // Extract policy data from form fields
    const createPolicyDto: CreatePolicyDto = {
      title: policyData.title,
      description: policyData.description,
      content: policyData.content,
      status: policyData.status || 'draft',
      expiryDate: policyData.expiryDate && policyData.expiryDate.trim() !== '' ? new Date(policyData.expiryDate) : undefined
    };
    
    return this.policiesService.createWithPDF(createPolicyDto, pdf, user.userId);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get current user policies (filtered by status)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by policy status',
    enum: ['draft', 'publish'],
  })
  @ApiResponse({
    status: 200,
    description: 'User policies retrieved successfully',
    type: [PolicyResponseDto],
  })
  async findAll(@CurrentUser() user: any, @Query('status') status?: string): Promise<PolicyResponseDto[]> {
    if (status) {
      return this.policiesService.findByUserIdAndStatus(user.userId, status);
    }
    return this.policiesService.findByUserId(user.userId);
  }

  @Get('my-policies')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get current user policies' })
  @ApiResponse({
    status: 200,
    description: 'User policies retrieved successfully',
    type: [PolicyResponseDto],
  })
  async findMyPolicies(@CurrentUser() user: any): Promise<PolicyResponseDto[]> {
    return this.policiesService.findByUserId(user.userId);
  }

  @Get('lifecycle/:lifecycle')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get policies by lifecycle state' })
  @ApiParam({ 
    name: 'lifecycle', 
    description: 'Policy lifecycle state',
    enum: ['active', 'expiring-soon', 'expired']
  })
  @ApiResponse({
    status: 200,
    description: 'Policies filtered by lifecycle state',
    type: [PolicyResponseDto],
  })
  async findByLifecycle(
    @Param('lifecycle') lifecycle: 'active' | 'expiring-soon' | 'expired',
    @CurrentUser() user: any
  ): Promise<PolicyResponseDto[]> {
    return this.policiesService.findByUserIdAndLifecycle(user.userId, lifecycle);
  }

  @Get('stats/lifecycle')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get policy lifecycle statistics' })
  @ApiResponse({
    status: 200,
    description: 'Policy lifecycle statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        active: { type: 'number' },
        expiringSoon: { type: 'number' },
        expired: { type: 'number' },
        draft: { type: 'number' }
      }
    }
  })
  async getLifecycleStats(@CurrentUser() user: any): Promise<{
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    draft: number;
  }> {
    return this.policiesService.getLifecycleStats(user.userId);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // Cache for 5 minutes
  @ApiOperation({ summary: 'Get current user policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy retrieved successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<PolicyResponseDto> {
    return this.policiesService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update policy by ID (draft only)' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy updated successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner or not draft' })
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    return this.policiesService.update(id, updatePolicyDto, user.userId);
  }

  @Post(':id/update-pdf')
  @UseInterceptors(FileInterceptor('pdf', {
    storage: memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  }))
  @ApiOperation({ summary: 'Update PDF for a draft policy' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy PDF updated successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner or not draft' })
  async updatePDF(
    @Param('id') id: string,
    @UploadedFile() pdf: Express.Multer.File,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    return this.policiesService.updatePDF(id, pdf, user.userId);
  }

  @Delete(':id/remove-pdf')
  @ApiOperation({ summary: 'Remove PDF from a draft policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy PDF removed successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner or not draft' })
  async removePDF(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    return this.policiesService.removePDF(id, user.userId);
  }

  @Post(':id/retry-pdf-processing')
  @ApiOperation({ summary: 'Retry PDF processing for a draft policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF processing retry initiated',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner or not draft' })
  @ApiResponse({ status: 400, description: 'PDF processing cannot be retried' })
  async retryPDFProcessing(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    return this.policiesService.retryPDFProcessing(id, user.userId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy published successfully',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner' })
  @ApiResponse({ status: 400, description: 'Policy cannot be published' })
  async publishPolicy(
    @Param('id') id: string,
    @Body() publishDto: PublishPolicyDto,
    @CurrentUser() user: any,
  ): Promise<PolicyResponseDto> {
    try {
      console.log(`🔍 Publishing policy ${id} for user ${user.userId}`);
      console.log(`🔍 Publish DTO:`, publishDto);
      
      const result = await this.policiesService.publishPolicy(id, publishDto, user.userId);
      console.log(`✅ Policy ${id} published successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Error publishing policy ${id}:`, error);
      throw error;
    }
  }

  @Get(':id/can-edit')
  @ApiOperation({ summary: 'Check if policy can be edited' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'Edit permission check result',
    schema: { type: 'boolean' },
  })
  async canEditPolicy(@Param('id') id: string, @CurrentUser() user: any): Promise<{ canEdit: boolean }> {
    const canEdit = await this.policiesService.canEditPolicy(id, user.userId);
    return { canEdit };
  }

  @Get(':id/can-use-ai')
  @ApiOperation({ summary: 'Check if policy can use AI' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'AI usage permission check result',
    schema: { type: 'boolean' },
  })
  async canUseAI(@Param('id') id: string, @CurrentUser() user: any): Promise<{ canUseAI: boolean }> {
    const canUseAI = await this.policiesService.canUseAI(id, user.userId);
    return { canUseAI };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Get policy PDF file for preview' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({
    status: 200,
    description: 'PDF file retrieved successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Policy not found or no PDF available' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner' })
  async getPolicyPDF(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ): Promise<void> {
    console.log('🔍 PDF endpoint called for policy:', id);
    const pdfBuffer = await this.policiesService.getPolicyPDF(id, user.userId);
    console.log('📄 PDF buffer received:', {
      length: pdfBuffer.length,
      type: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer)
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="policy.pdf"',
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    });
    
    console.log('📤 Sending PDF response with headers:', {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length.toString()
    });
    
    res.send(pdfBuffer);
  }

  @Get(':id/pdf-debug')
  @ApiOperation({ summary: 'Debug PDF data - returns raw data info' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async getPolicyPDFDebug(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    const pdfBuffer = await this.policiesService.getPolicyPDF(id, user.userId);
    
    return {
      length: pdfBuffer.length,
      isBuffer: Buffer.isBuffer(pdfBuffer),
      header: pdfBuffer.slice(0, 10).toString('hex'),
      firstBytes: pdfBuffer.slice(0, 20).toString('utf8'),
      lastBytes: pdfBuffer.slice(-20).toString('utf8'),
      sample: pdfBuffer.slice(0, 100).toString('hex')
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiResponse({ status: 204, description: 'Policy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not policy owner' })
  async remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    console.log('=== DEBUG CONTROLLER ===');
    console.log('User object:', user);
    console.log('User ID:', user.userId);
    console.log('User ID type:', typeof user.userId);
    console.log('=== END DEBUG CONTROLLER ===');
    
    return this.policiesService.remove(id, user.userId);
  }
}
