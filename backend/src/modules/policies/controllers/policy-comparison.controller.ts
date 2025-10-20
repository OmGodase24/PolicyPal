import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Patch,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PolicyComparisonService } from '../services/policy-comparison.service';
import { 
  CreatePolicyComparisonDto, 
  PolicyComparisonResponseDto, 
  PolicyComparisonListResponseDto,
  ComparePoliciesRequestDto 
} from '../dto/policy-comparison.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Policy Comparison')
@Controller('policy-comparisons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PolicyComparisonController {
  constructor(private readonly comparisonService: PolicyComparisonService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new policy comparison' })
  @ApiResponse({
    status: 201,
    description: 'Policy comparison created successfully',
    type: PolicyComparisonResponseDto,
  })
  async createComparison(
    @Body() createComparisonDto: CreatePolicyComparisonDto,
    @CurrentUser() user: any,
  ): Promise<PolicyComparisonResponseDto> {
    return this.comparisonService.createComparison(createComparisonDto, user.userId);
  }

  @Post('compare/quick')
  @ApiOperation({ summary: 'Compare two specific policies' })
  @ApiResponse({
    status: 201,
    description: 'Policy comparison created successfully',
    type: PolicyComparisonResponseDto,
  })
  async comparePolicies(
    @Body() compareRequest: ComparePoliciesRequestDto,
    @CurrentUser() user: any,
  ): Promise<PolicyComparisonResponseDto> {
    return this.comparisonService.comparePolicies(compareRequest, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user policy comparisons with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Policy comparisons retrieved successfully',
    type: PolicyComparisonListResponseDto,
  })
  async getUserComparisons(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PolicyComparisonListResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.comparisonService.getUserComparisons(user.userId, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific policy comparison by ID' })
  @ApiParam({ name: 'id', description: 'Comparison ID' })
  @ApiResponse({
    status: 200,
    description: 'Policy comparison retrieved successfully',
    type: PolicyComparisonResponseDto,
  })
  async getComparisonById(
    @Param('id') comparisonId: string,
    @CurrentUser() user: any,
  ): Promise<PolicyComparisonResponseDto> {
    return this.comparisonService.getComparisonById(comparisonId, user.userId);
  }

  @Patch(':id/regenerate-insights')
  @ApiOperation({ summary: 'Regenerate AI insights for a comparison' })
  @ApiParam({ name: 'id', description: 'Comparison ID' })
  @ApiResponse({
    status: 200,
    description: 'AI insights regenerated successfully',
    type: PolicyComparisonResponseDto,
  })
  async regenerateAIInsights(
    @Param('id') comparisonId: string,
    @CurrentUser() user: any,
  ): Promise<PolicyComparisonResponseDto> {
    return this.comparisonService.regenerateAIInsights(comparisonId, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a policy comparison' })
  @ApiParam({ name: 'id', description: 'Comparison ID' })
  @ApiResponse({
    status: 204,
    description: 'Policy comparison deleted successfully',
  })
  async deleteComparison(
    @Param('id') comparisonId: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.comparisonService.deleteComparison(comparisonId, user.userId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export policy comparison as PDF' })
  @ApiParam({ name: 'id', description: 'Comparison ID' })
  @ApiResponse({
    status: 200,
    description: 'Comparison exported successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async exportComparison(
    @Param('id') comparisonId: string,
    @CurrentUser() user: any,
    @Res() res: any,
  ): Promise<void> {
    const pdfBuffer = await this.comparisonService.exportComparison(comparisonId, user.userId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="policy-comparison-${comparisonId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.send(pdfBuffer);
  }
}
