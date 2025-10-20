import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsRequestDto, DashboardAnalyticsDto, TimeRange } from '../dto/analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard analytics retrieved successfully',
    type: DashboardAnalyticsDto
  })
  async getDashboardAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsRequestDto
  ): Promise<DashboardAnalyticsDto> {
    const userId = req.user.userId;
    const timeRange = query.timeRange || TimeRange.LAST_30_DAYS;
    
    return this.analyticsService.getDashboardAnalytics(userId, timeRange);
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get policy-specific analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Policy analytics retrieved successfully'
  })
  async getPolicyAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsRequestDto
  ) {
    const userId = req.user.userId;
    const timeRange = query.timeRange || TimeRange.LAST_30_DAYS;
    
    return this.analyticsService.getPolicyAnalytics(userId, this.getDateRange(timeRange));
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Compliance analytics retrieved successfully'
  })
  async getComplianceAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsRequestDto
  ) {
    const userId = req.user.userId;
    const timeRange = query.timeRange || TimeRange.LAST_30_DAYS;
    
    return this.analyticsService.getComplianceAnalytics(userId, this.getDateRange(timeRange));
  }

  @Get('user-activity')
  @ApiOperation({ summary: 'Get user activity analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'User activity analytics retrieved successfully'
  })
  async getUserActivityAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsRequestDto
  ) {
    const userId = req.user.userId;
    const timeRange = query.timeRange || TimeRange.LAST_30_DAYS;
    
    return this.analyticsService.getPersonalActivityAnalytics(userId, this.getDateRange(timeRange));
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification analytics retrieved successfully'
  })
  async getNotificationAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsRequestDto
  ) {
    const userId = req.user.userId;
    const timeRange = query.timeRange || TimeRange.LAST_30_DAYS;
    
    return this.analyticsService.getNotificationAnalytics(userId, this.getDateRange(timeRange));
  }

  private getDateRange(timeRange: TimeRange): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case TimeRange.LAST_7_DAYS:
        start.setDate(end.getDate() - 7);
        break;
      case TimeRange.LAST_30_DAYS:
        start.setDate(end.getDate() - 30);
        break;
      case TimeRange.LAST_3_MONTHS:
        start.setMonth(end.getMonth() - 3);
        break;
      case TimeRange.LAST_6_MONTHS:
        start.setMonth(end.getMonth() - 6);
        break;
      case TimeRange.LAST_YEAR:
        start.setFullYear(end.getFullYear() - 1);
        break;
      case TimeRange.ALL_TIME:
        start.setFullYear(2020);
        break;
    }

    return { start, end };
  }
}
