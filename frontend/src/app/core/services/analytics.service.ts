import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface PolicyAnalytics {
  totalPolicies: number;
  activePolicies: number;
  draftPolicies: number;
  expiringPolicies: number;
  expiredPolicies: number;
  policiesOverTime: Array<{
    date: string;
    count: number;
    cumulative: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  lifecycleDistribution: Array<{
    lifecycle: string;
    count: number;
    percentage: number;
  }>;
  averageCreationRate: number;
  mostActivePeriod: string;
}

export interface ComplianceAnalytics {
  overallScore: number;
  frameworkScores: Array<{
    framework: string;
    score: number;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  complianceTrends: Array<{
    date: string;
    averageScore: number;
    totalChecks: number;
  }>;
  riskDistribution: Array<{
    riskLevel: string;
    count: number;
    percentage: number;
  }>;
  commonIssues: Array<{
    issue: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export interface UserActivityAnalytics {
  totalUsers: number;
  newUsersOverTime: Array<{
    date: string;
    count: number;
  }>;
  activityPatterns: Array<{
    hour: number;
    activity: number;
  }>;
  topUsers: Array<{
    userId: string;
    userName: string;
    activityCount: number;
    lastActive: string;
  }>;
  featureUsage: Array<{
    feature: string;
    usageCount: number;
    uniqueUsers: number;
  }>;
}

export interface NotificationAnalytics {
  totalNotifications: number;
  deliveryRates: Array<{
    channel: string;
    sent: number;
    delivered: number;
    rate: number;
  }>;
  typeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  engagementOverTime: Array<{
    date: string;
    sent: number;
    read: number;
    engagementRate: number;
  }>;
}

export interface PersonalAnalytics {
  policies: PolicyAnalytics;
  compliance: ComplianceAnalytics;
  notifications: NotificationAnalytics;
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

export interface PlatformAnalytics {
  userGrowth: {
    totalUsers: number;
    newUsersOverTime: Array<{ date: string; count: number; cumulative: number }>;
    growthRate: number;
    previousPeriodUsers: number;
  };
  platformActivity: {
    totalPolicies: number;
    totalNotifications: number;
    totalChatSessions: number;
    avgPoliciesPerUser: number;
    avgNotificationsPerUser: number;
    avgChatSessionsPerUser: number;
  };
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

export interface DashboardAnalytics {
  personal: PersonalAnalytics;
  platform: PlatformAnalytics;
  generatedAt: string;
}

export enum TimeRange {
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_3_MONTHS = '3m',
  LAST_6_MONTHS = '6m',
  LAST_YEAR = '1y',
  ALL_TIME = 'all'
}

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

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  getDashboardAnalytics(timeRange: TimeRange = TimeRange.LAST_30_DAYS): Observable<DashboardAnalytics> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.http.get<DashboardAnalytics>(`${this.apiUrl}/analytics/dashboard`, { params });
  }

  getPolicyAnalytics(timeRange: TimeRange = TimeRange.LAST_30_DAYS): Observable<PolicyAnalytics> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.http.get<PolicyAnalytics>(`${this.apiUrl}/analytics/policies`, { params });
  }

  getComplianceAnalytics(timeRange: TimeRange = TimeRange.LAST_30_DAYS): Observable<ComplianceAnalytics> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.http.get<ComplianceAnalytics>(`${this.apiUrl}/analytics/compliance`, { params });
  }

  getUserActivityAnalytics(timeRange: TimeRange = TimeRange.LAST_30_DAYS): Observable<UserActivityAnalytics> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.http.get<UserActivityAnalytics>(`${this.apiUrl}/analytics/user-activity`, { params });
  }

  getNotificationAnalytics(timeRange: TimeRange = TimeRange.LAST_30_DAYS): Observable<NotificationAnalytics> {
    const params = new HttpParams().set('timeRange', timeRange);
    return this.http.get<NotificationAnalytics>(`${this.apiUrl}/analytics/notifications`, { params });
  }
}
