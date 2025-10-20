import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  AREA = 'area',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  TREEMAP = 'treemap',
  RADAR = 'radar'
}

export enum TimeRange {
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_3_MONTHS = '3m',
  LAST_6_MONTHS = '6m',
  LAST_YEAR = '1y',
  ALL_TIME = 'all'
}

export class AnalyticsRequestDto {
  @ApiProperty({
    description: 'Time range for analytics',
    enum: TimeRange,
    default: TimeRange.LAST_30_DAYS,
    required: false
  })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange = TimeRange.LAST_30_DAYS;

  @ApiProperty({
    description: 'Start date for custom range',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for custom range',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Chart type for visualization',
    enum: ChartType,
    required: false
  })
  @IsOptional()
  @IsEnum(ChartType)
  chartType?: ChartType;
}

export class PolicyAnalyticsDto {
  @ApiProperty({ description: 'Total number of policies' })
  totalPolicies: number;

  @ApiProperty({ description: 'Number of active policies' })
  activePolicies: number;

  @ApiProperty({ description: 'Number of draft policies' })
  draftPolicies: number;

  @ApiProperty({ description: 'Number of expiring policies' })
  expiringPolicies: number;

  @ApiProperty({ description: 'Number of expired policies' })
  expiredPolicies: number;

  @ApiProperty({ description: 'Policies created over time' })
  policiesOverTime: Array<{
    date: string;
    count: number;
    cumulative: number;
  }>;

  @ApiProperty({ description: 'Policy status distribution' })
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Policy lifecycle distribution' })
  lifecycleDistribution: Array<{
    lifecycle: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Average policy creation rate' })
  averageCreationRate: number;

  @ApiProperty({ description: 'Most active creation period' })
  mostActivePeriod: string;
}

export class ComplianceAnalyticsDto {
  @ApiProperty({ description: 'Overall compliance score' })
  overallScore: number;

  @ApiProperty({ description: 'Compliance score by framework' })
  frameworkScores: Array<{
    framework: string;
    score: number;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;

  @ApiProperty({ description: 'Compliance trends over time' })
  complianceTrends: Array<{
    date: string;
    averageScore: number;
    totalChecks: number;
  }>;


  @ApiProperty({ description: 'Most common compliance issues' })
  commonIssues: Array<{
    issue: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export class UserActivityAnalyticsDto {
  @ApiProperty({ description: 'Total active users' })
  totalUsers: number;

  @ApiProperty({ description: 'New users over time' })
  newUsersOverTime: Array<{
    date: string;
    count: number;
  }>;

  @ApiProperty({ description: 'User activity patterns' })
  activityPatterns: Array<{
    hour: number;
    activity: number;
  }>;

  @ApiProperty({ description: 'Most active users' })
  topUsers: Array<{
    userId: string;
    userName: string;
    activityCount: number;
    lastActive: string;
  }>;

  @ApiProperty({ description: 'Feature usage statistics' })
  featureUsage: Array<{
    feature: string;
    usageCount: number;
    uniqueUsers: number;
  }>;
}

export class NotificationAnalyticsDto {
  @ApiProperty({ description: 'Total notifications sent' })
  totalNotifications: number;

  @ApiProperty({ description: 'Notification delivery rates' })
  deliveryRates: Array<{
    channel: string;
    sent: number;
    delivered: number;
    rate: number;
  }>;

  @ApiProperty({ description: 'Notification types distribution' })
  typeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Notification engagement over time' })
  engagementOverTime: Array<{
    date: string;
    sent: number;
    read: number;
    engagementRate: number;
  }>;
}

export class PersonalAnalyticsDto {
  @ApiProperty({ description: 'Policy analytics for the user' })
  policies: PolicyAnalyticsDto;

  @ApiProperty({ description: 'Compliance analytics for the user' })
  compliance: ComplianceAnalyticsDto;

  @ApiProperty({ description: 'Notification analytics for the user' })
  notifications: NotificationAnalyticsDto;

  @ApiProperty({ description: 'Personal activity analytics' })
  personalActivity: {
    activityPatterns: Array<{ hour: number; activity: number }>;
    featureUsage: Array<{ feature: string; usageCount: number; uniqueUsers: number }>;
    productivityMetrics: {
      totalActivities: number;
      dailyProductivity: number;
      mostProductiveDay: string;
      productivityScore: number;
      policiesCreated: number;
      notificationsReceived: number;
      chatSessions: number;
    };
  };
}

export class PlatformAnalyticsDto {
  @ApiProperty({ description: 'User growth analytics' })
  userGrowth: {
    totalUsers: number;
    newUsersOverTime: Array<{ date: string; count: number; cumulative: number }>;
    growthRate: number;
    previousPeriodUsers: number;
  };

  @ApiProperty({ description: 'Platform activity analytics' })
  platformActivity: {
    totalPolicies: number;
    totalNotifications: number;
    totalChatSessions: number;
    avgPoliciesPerUser: number;
    avgNotificationsPerUser: number;
    avgChatSessionsPerUser: number;
  };

  @ApiProperty({ description: 'System metrics' })
  systemMetrics: {
    totalUsers: number;
    totalPolicies: number;
    totalNotifications: number;
    activeUsers: number;
    publishedPolicies: number;
    draftPolicies: number;
    systemHealth: {
      userEngagement: number;
      policyCompletion: number;
    };
  };
}

export class DashboardAnalyticsDto {
  @ApiProperty({ description: 'Personal analytics for the logged-in user' })
  personal: PersonalAnalyticsDto;

  @ApiProperty({ description: 'Platform-wide analytics' })
  platform: PlatformAnalyticsDto;

  @ApiProperty({ description: 'Generated at timestamp' })
  generatedAt: string;
}
