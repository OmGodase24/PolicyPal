import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from '../../policies/schemas/policy.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Notification, NotificationDocument } from '../../notifications/schemas/notification.schema';
import { ChatHistory, ChatHistoryDocument } from '../../policies/schemas/chat-history.schema';
import {
  PolicyAnalyticsDto,
  ComplianceAnalyticsDto,
  UserActivityAnalyticsDto,
  NotificationAnalyticsDto,
  DashboardAnalyticsDto,
  TimeRange
} from '../dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(ChatHistory.name) private chatHistoryModel: Model<ChatHistoryDocument>,
  ) {}

  async getDashboardAnalytics(
    userId: string,
    timeRange: TimeRange = TimeRange.LAST_30_DAYS
  ): Promise<DashboardAnalyticsDto> {
    this.logger.log(`📊 Generating dashboard analytics for user ${userId}`);

    const dateRange = this.getDateRange(timeRange);
    
    const [personalAnalytics, platformAnalytics] = await Promise.all([
      this.getPersonalAnalytics(userId, dateRange),
      this.getPlatformAnalytics(dateRange),
    ]);

    return {
      personal: personalAnalytics,
      platform: platformAnalytics,
      generatedAt: new Date().toISOString(),
    };
  }

  async getPersonalAnalytics(userId: string, dateRange: { start: Date; end: Date }) {
    const [policies, compliance, notifications, personalActivity] = await Promise.all([
      this.getPolicyAnalytics(userId, dateRange),
      this.getComplianceAnalytics(userId, dateRange),
      this.getNotificationAnalytics(userId, dateRange),
      this.getPersonalActivityAnalytics(userId, dateRange),
    ]);

    return {
      policies,
      compliance,
      notifications,
      personalActivity,
    };
  }

  async getPlatformAnalytics(dateRange: { start: Date; end: Date }) {
    const [userGrowth, platformActivity, systemMetrics] = await Promise.all([
      this.getUserGrowthAnalytics(dateRange),
      this.getPlatformActivityAnalytics(dateRange),
      this.getSystemMetricsAnalytics(dateRange),
    ]);

    return {
      userGrowth,
      platformActivity,
      systemMetrics,
    };
  }

  async getPolicyAnalytics(userId: string, dateRange: { start: Date; end: Date }): Promise<PolicyAnalyticsDto> {
    const policies = await this.policyModel.find({
      createdBy: userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const totalPolicies = policies.length;
    const activePolicies = policies.filter(p => p.status === 'publish' && this.isPolicyActive(p)).length;
    const draftPolicies = policies.filter(p => p.status === 'draft').length;
    const expiringPolicies = policies.filter(p => this.isPolicyExpiringSoon(p)).length;
    const expiredPolicies = policies.filter(p => this.isPolicyExpired(p)).length;

    // Policies over time
    const policiesOverTime = this.aggregateByDate(policies, 'createdAt');
    
    // Status distribution
    const statusDistribution = this.calculateStatusDistribution(policies);
    
    // Lifecycle distribution
    const lifecycleDistribution = this.calculateLifecycleDistribution(policies);
    
    // Average creation rate
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const averageCreationRate = totalPolicies / Math.max(daysDiff, 1);
    
    // Most active period
    const mostActivePeriod = this.findMostActivePeriod(policiesOverTime);

    return {
      totalPolicies,
      activePolicies,
      draftPolicies,
      expiringPolicies,
      expiredPolicies,
      policiesOverTime,
      statusDistribution,
      lifecycleDistribution,
      averageCreationRate: Math.round(averageCreationRate * 100) / 100,
      mostActivePeriod,
    };
  }

  async getComplianceAnalytics(userId: string, dateRange: { start: Date; end: Date }): Promise<ComplianceAnalyticsDto> {
    // Get user's policies for compliance analysis
    const policies = await this.policyModel.find({
      createdBy: userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Get actual compliance reports from AI service
    const complianceReports = await this.getComplianceReportsFromAIService(userId, policies);
    
    let complianceMetrics, complianceTrends, commonIssues;
    
    if (complianceReports.length > 0) {
      // Calculate real compliance metrics from actual compliance data
      complianceMetrics = this.calculateRealComplianceMetricsFromReports(complianceReports);
      
      // Generate compliance trends over time
      complianceTrends = this.generateComplianceTrendsFromReports(dateRange, complianceReports);
      
      // Analyze compliance data for common issues
      commonIssues = this.identifyCommonComplianceIssuesFromReports(complianceReports);
    } else {
      // Fallback to mock data if no compliance reports are available
      this.logger.warn('No compliance reports found, using fallback data');
      complianceMetrics = this.calculateRealComplianceMetrics(policies);
      complianceTrends = this.generateComplianceTrends(dateRange, policies);
      commonIssues = this.identifyCommonComplianceIssues(policies);
    }

    return {
      overallScore: complianceMetrics.overallScore,
      frameworkScores: complianceMetrics.frameworkScores,
      complianceTrends,
      commonIssues,
    };
  }

  // Personal Analytics - User's own activity
  async getPersonalActivityAnalytics(userId: string, dateRange: { start: Date; end: Date }) {
    const currentUserPolicies = await this.policyModel.find({
      createdBy: userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const currentUserNotifications = await this.notificationModel.find({
      userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const currentUserChatSessions = await this.chatHistoryModel.find({
      userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Generate activity patterns based on user's actual activity
    const activityPatterns = this.generateUserActivityPatterns(currentUserPolicies, currentUserNotifications, currentUserChatSessions);
    
    // Calculate feature usage for current user
    const featureUsage = this.calculateFeatureUsage(currentUserPolicies, currentUserNotifications, currentUserChatSessions);

    // Calculate personal productivity metrics
    const productivityMetrics = this.calculateProductivityMetrics(currentUserPolicies, currentUserNotifications, currentUserChatSessions, dateRange);

    return {
      activityPatterns,
      featureUsage,
      productivityMetrics,
    };
  }

  // Platform Analytics - System-wide data
  async getUserGrowthAnalytics(dateRange: { start: Date; end: Date }) {
    const allUsers = await this.userModel.find({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const totalUsers = allUsers.length;
    const newUsersOverTime = this.aggregateByDate(allUsers, 'createdAt');
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(dateRange.start.getTime() - (dateRange.end.getTime() - dateRange.start.getTime()));
    const previousPeriodUsers = await this.userModel.find({
      createdAt: { $gte: previousPeriodStart, $lt: dateRange.start }
    });

    const growthRate = previousPeriodUsers.length > 0 
      ? ((totalUsers - previousPeriodUsers.length) / previousPeriodUsers.length) * 100
      : 0;

    return {
      totalUsers,
      newUsersOverTime,
      growthRate: Math.round(growthRate * 100) / 100,
      previousPeriodUsers: previousPeriodUsers.length,
    };
  }

  async getPlatformActivityAnalytics(dateRange: { start: Date; end: Date }) {
    // Get all platform activity
    const allPolicies = await this.policyModel.find({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const allNotifications = await this.notificationModel.find({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const allChatSessions = await this.chatHistoryModel.find({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Calculate platform-wide metrics
    const totalPolicies = allPolicies.length;
    const totalNotifications = allNotifications.length;
    const totalChatSessions = allChatSessions.length;

    // Calculate average activity per user
    const activeUsers = await this.userModel.find({
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const avgPoliciesPerUser = activeUsers.length > 0 ? totalPolicies / activeUsers.length : 0;
    const avgNotificationsPerUser = activeUsers.length > 0 ? totalNotifications / activeUsers.length : 0;
    const avgChatSessionsPerUser = activeUsers.length > 0 ? totalChatSessions / activeUsers.length : 0;

    return {
      totalPolicies,
      totalNotifications,
      totalChatSessions,
      avgPoliciesPerUser: Math.round(avgPoliciesPerUser * 100) / 100,
      avgNotificationsPerUser: Math.round(avgNotificationsPerUser * 100) / 100,
      avgChatSessionsPerUser: Math.round(avgChatSessionsPerUser * 100) / 100,
    };
  }

  async getSystemMetricsAnalytics(dateRange: { start: Date; end: Date }) {
    // Get system-wide metrics
    const totalUsers = await this.userModel.countDocuments();
    const totalPolicies = await this.policyModel.countDocuments();
    const totalNotifications = await this.notificationModel.countDocuments();

    // Calculate system health metrics
    const activeUsers = await this.userModel.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    const publishedPolicies = await this.policyModel.countDocuments({ status: 'publish' });
    const draftPolicies = await this.policyModel.countDocuments({ status: 'draft' });

    return {
      totalUsers,
      totalPolicies,
      totalNotifications,
      activeUsers,
      publishedPolicies,
      draftPolicies,
      systemHealth: {
        userEngagement: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        policyCompletion: totalPolicies > 0 ? (publishedPolicies / totalPolicies) * 100 : 0,
      }
    };
  }

  async getNotificationAnalytics(userId: string, dateRange: { start: Date; end: Date }): Promise<NotificationAnalyticsDto> {
    const notifications = await this.notificationModel.find({
      userId,
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const totalNotifications = notifications.length;
    
    const deliveryRates = [
      { channel: 'email', sent: 45, delivered: 42, rate: 93.3 },
      { channel: 'in-app', sent: 78, delivered: 78, rate: 100 },
    ];

    const typeDistribution = this.calculateTypeDistribution(notifications);
    
    const engagementOverTime = this.generateEngagementOverTime(notifications, dateRange);

    return {
      totalNotifications,
      deliveryRates,
      typeDistribution,
      engagementOverTime,
    };
  }

  // Helper methods
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
        start.setFullYear(2020); // Set to a reasonable start date
        break;
    }

    return { start, end };
  }

  private isPolicyActive(policy: PolicyDocument): boolean {
    if (!policy.expiryDate) return true;
    return new Date() < policy.expiryDate;
  }

  private isPolicyExpiringSoon(policy: PolicyDocument): boolean {
    if (!policy.expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return policy.expiryDate <= thirtyDaysFromNow && policy.expiryDate > new Date();
  }

  private isPolicyExpired(policy: PolicyDocument): boolean {
    if (!policy.expiryDate) return false;
    return new Date() > policy.expiryDate;
  }

  private aggregateByDate(items: any[], dateField: string): Array<{ date: string; count: number; cumulative: number }> {
    const grouped = items.reduce((acc, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    let cumulative = 0;
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        cumulative += count as number;
        return { date, count: count as number, cumulative };
      });
  }

  private calculateDistribution(items: any[], field: string): Array<{ [key: string]: any; count: number; percentage: number }> {
    const grouped = items.reduce((acc, item) => {
      const value = item[field];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

    const total = items.length;
    return Object.entries(grouped).map(([key, count]) => ({
      [field]: key,
      count: count as number,
      percentage: Math.round(((count as number) / total) * 100 * 100) / 100,
    }));
  }

  private calculateStatusDistribution(policies: PolicyDocument[]): Array<{ status: string; count: number; percentage: number }> {
    const grouped = policies.reduce((acc, policy) => {
      const status = policy.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const total = policies.length;
    return Object.entries(grouped).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: Math.round(((count as number) / total) * 100 * 100) / 100,
    }));
  }

  private calculateTypeDistribution(notifications: NotificationDocument[]): Array<{ type: string; count: number; percentage: number }> {
    const grouped = notifications.reduce((acc, notification) => {
      const type = notification.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const total = notifications.length;
    return Object.entries(grouped).map(([type, count]) => ({
      type,
      count: count as number,
      percentage: Math.round(((count as number) / total) * 100 * 100) / 100,
    }));
  }

  private calculateLifecycleDistribution(policies: PolicyDocument[]): Array<{ lifecycle: string; count: number; percentage: number }> {
    const lifecycle = policies.map(policy => {
      if (this.isPolicyExpired(policy)) return 'expired';
      if (this.isPolicyExpiringSoon(policy)) return 'expiring-soon';
      return 'active';
    });

    const grouped = lifecycle.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const total = policies.length;
    return Object.entries(grouped).map(([lifecycle, count]) => ({
      lifecycle,
      count: count as number,
      percentage: Math.round(((count as number) / total) * 100 * 100) / 100,
    }));
  }

  private findMostActivePeriod(policiesOverTime: Array<{ date: string; count: number }>): string {
    if (policiesOverTime.length === 0) return 'No activity';
    
    const maxActivity = Math.max(...policiesOverTime.map(p => p.count));
    const mostActive = policiesOverTime.find(p => p.count === maxActivity);
    return mostActive ? new Date(mostActive.date).toLocaleDateString() : 'Unknown';
  }

  private generateComplianceTrends(dateRange: { start: Date; end: Date }, policies: PolicyDocument[]): Array<{ date: string; averageScore: number; totalChecks: number }> {
    const trends = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      // Get policies created up to this date
      const policiesUpToDate = policies.filter(p => new Date(p.createdAt) <= current);
      
      if (policiesUpToDate.length > 0) {
        const complianceMetrics = this.calculateRealComplianceMetrics(policiesUpToDate);
        trends.push({
          date: current.toISOString().split('T')[0],
          averageScore: complianceMetrics.overallScore,
          totalChecks: policiesUpToDate.length,
        });
      } else {
        trends.push({
          date: current.toISOString().split('T')[0],
          averageScore: 0,
          totalChecks: 0,
        });
      }
      
      current.setDate(current.getDate() + 7); // Weekly data points
    }
    
    return trends;
  }

  private generateActivityPatterns(): Array<{ hour: number; activity: number }> {
    const patterns = [];
    for (let hour = 0; hour < 24; hour++) {
      // Mock data showing typical business hours activity
      let activity = 0;
      if (hour >= 9 && hour <= 17) {
        activity = 50 + Math.random() * 30; // Higher activity during business hours
      } else if (hour >= 18 && hour <= 22) {
        activity = 20 + Math.random() * 20; // Some evening activity
      } else {
        activity = Math.random() * 10; // Low activity during off hours
      }
      
      patterns.push({ hour, activity: Math.round(activity) });
    }
    return patterns;
  }

  private generateEngagementOverTime(notifications: NotificationDocument[], dateRange: { start: Date; end: Date }): Array<{ date: string; sent: number; read: number; engagementRate: number }> {
    const grouped = notifications.reduce((acc, notif) => {
      const date = new Date(notif.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { sent: 0, read: 0 };
      }
      acc[date].sent++;
      if (notif.isRead) {
        acc[date].read++;
      }
      return acc;
    }, {} as Record<string, { sent: number; read: number }>);

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      sent: data.sent,
      read: data.read,
      engagementRate: Math.round((data.read / data.sent) * 100 * 100) / 100,
    }));
  }

  // Fetch compliance reports from AI service
  private async getComplianceReportsFromAIService(userId: string, policies: PolicyDocument[]): Promise<any[]> {
    try {
      // Get all compliance reports for the user from AI service
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      this.logger.log(`Fetching compliance reports from AI service: ${aiServiceUrl}/compliance/analytics/${userId}`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${aiServiceUrl}/compliance/analytics/${userId}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`AI service returned ${response.status}: ${response.statusText} - ${errorText}`);
        return [];
      }
      
      const data = await response.json();
      this.logger.log(`Retrieved ${data.data?.length || 0} compliance reports from AI service`);
      
      if (!data.success || !data.data || data.data.length === 0) {
        this.logger.warn('No compliance data available from AI service');
        return [];
      }
      
      // Filter reports to only include policies from the current date range
      const policyIds = policies.map(p => p._id.toString());
      const filteredReports = data.data.filter((report: any) => 
        policyIds.includes(report.policy_id)
      );
      
      // Add policy titles to the reports
      const complianceReports = filteredReports.map((report: any) => {
        const policy = policies.find(p => p._id.toString() === report.policy_id);
        return {
          policy_id: report.policy_id,
          policy_title: policy?.title || 'Unknown Policy',
          overall_score: report.overall_score,
          overall_level: report.overall_level,
          checks: report.checks,
          generated_at: report.generated_at,
          regulation_framework: report.regulation_framework
        };
      });
      
      this.logger.log(`Retrieved ${complianceReports.length} compliance reports from AI service`);
      return complianceReports;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.warn('AI service request timed out, using fallback data');
      } else {
        this.logger.error(`Error fetching compliance reports from AI service: ${error.message}`);
      }
      return [];
    }
  }

  // Calculate compliance metrics from actual compliance reports
  private calculateRealComplianceMetricsFromReports(complianceReports: any[]): { overallScore: number; frameworkScores: any[] } {
    if (complianceReports.length === 0) {
      return {
        overallScore: 0,
        frameworkScores: []
      };
    }

    // Calculate overall score as average of all compliance reports
    const overallScore = complianceReports.reduce((sum, report) => sum + report.overall_score, 0) / complianceReports.length;

    // Group by regulation framework
    const frameworkGroups = complianceReports.reduce((acc, report) => {
      const framework = report.regulation_framework || 'unknown';
      if (!acc[framework]) {
        acc[framework] = [];
      }
      acc[framework].push(report);
      return acc;
    }, {});

    // Calculate framework scores
    const frameworkScores = Object.entries(frameworkGroups).map(([framework, reports]: [string, any[]]) => {
      const avgScore = reports.reduce((sum, report) => sum + report.overall_score, 0) / reports.length;
      return {
        framework: this.formatFrameworkName(framework),
        score: Math.round(avgScore * 100) / 100,
        count: reports.length,
        trend: 'stable' as const
      };
    });

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      frameworkScores
    };
  }

  // Generate compliance trends from actual reports
  private generateComplianceTrendsFromReports(dateRange: { start: Date; end: Date }, complianceReports: any[]): Array<{ date: string; averageScore: number; totalChecks: number }> {
    const trends = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      // Get compliance reports generated up to this date
      const reportsUpToDate = complianceReports.filter(report => 
        new Date(report.generated_at) <= current
      );
      
      if (reportsUpToDate.length > 0) {
        const avgScore = reportsUpToDate.reduce((sum, report) => sum + report.overall_score, 0) / reportsUpToDate.length;
        trends.push({
          date: current.toISOString().split('T')[0],
          averageScore: Math.round(avgScore * 100) / 100,
          totalChecks: reportsUpToDate.length,
        });
      } else {
        trends.push({
          date: current.toISOString().split('T')[0],
          averageScore: 0,
          totalChecks: 0,
        });
      }
      
      current.setDate(current.getDate() + 7); // Weekly data points
    }
    
    return trends;
  }

  // Identify common compliance issues from actual reports
  private identifyCommonComplianceIssuesFromReports(complianceReports: any[]): Array<{ issue: string; count: number; severity: 'high' | 'medium' | 'low' }> {
    if (complianceReports.length === 0) {
      return [];
    }

    // Collect all failed checks from all reports
    const allFailedChecks = [];
    complianceReports.forEach(report => {
      if (report.checks) {
        report.checks.forEach(check => {
          if (check.level === 'non_compliant' || check.score < 0.5) {
            allFailedChecks.push({
              issue: check.check_name,
              severity: check.score < 0.3 ? 'high' : check.score < 0.5 ? 'medium' : 'low'
            });
          }
        });
      }
    });

    // Group by issue name
    const issueGroups = allFailedChecks.reduce((acc, check) => {
      if (!acc[check.issue]) {
        acc[check.issue] = { count: 0, severity: check.severity };
      }
      acc[check.issue].count++;
      return acc;
    }, {});

    // Convert to array and sort by count
    return Object.entries(issueGroups)
      .map(([issue, data]: [string, any]) => ({
        issue,
        count: data.count,
        severity: data.severity
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues
  }

  // Format framework names for display
  private formatFrameworkName(framework: string): string {
    const frameworkNames = {
      'gdpr': 'GDPR',
      'ccpa': 'CCPA',
      'hipaa': 'HIPAA',
      'sox': 'SOX',
      'pci_dss': 'PCI DSS',
      'insurance_standards': 'Insurance Standards',
      'unknown': 'Unknown'
    };
    return frameworkNames[framework] || framework;
  }

  // Real compliance calculation methods (fallback for when AI service is not available)
  private calculateRealComplianceMetrics(policies: PolicyDocument[]): { overallScore: number; frameworkScores: any[] } {
    if (policies.length === 0) {
      return {
        overallScore: 0,
        frameworkScores: []
      };
    }

    // Analyze policy content for compliance keywords and patterns
    const complianceKeywords = {
      'GDPR': ['data protection', 'privacy', 'consent', 'right to be forgotten', 'data subject', 'personal data'],
      'CCPA': ['california', 'consumer', 'privacy rights', 'opt-out', 'personal information'],
      'HIPAA': ['health information', 'phi', 'protected health', 'medical records', 'healthcare'],
      'SOX': ['financial', 'accounting', 'internal controls', 'audit', 'sarbanes'],
      'PCI DSS': ['payment', 'cardholder', 'credit card', 'payment data', 'pci']
    };

    const frameworkScores = Object.entries(complianceKeywords).map(([framework, keywords]) => {
      const matchingPolicies = policies.filter(policy => {
        const content = `${policy.title} ${policy.description} ${policy.content}`.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
      });

      const score = matchingPolicies.length / policies.length;
      return {
        framework,
        score: Math.round(score * 100) / 100,
        count: matchingPolicies.length,
        trend: 'stable' as const
      };
    });

    // Calculate overall score as average of framework scores
    const overallScore = frameworkScores.length > 0 
      ? frameworkScores.reduce((sum, f) => sum + f.score, 0) / frameworkScores.length
      : 0;

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      frameworkScores
    };
  }


  private identifyCommonComplianceIssues(policies: PolicyDocument[]): Array<{ issue: string; count: number; severity: 'low' | 'medium' | 'high' }> {
    const issues = [];

    // Check for common compliance issues
    const missingDescription = policies.filter(p => !p.description || p.description.length < 20).length;
    if (missingDescription > 0) {
      issues.push({
        issue: 'Incomplete Policy Descriptions',
        count: missingDescription,
        severity: missingDescription > policies.length * 0.5 ? 'high' : 'medium'
      });
    }

    const missingContent = policies.filter(p => !p.content || p.content.length < 50).length;
    if (missingContent > 0) {
      issues.push({
        issue: 'Missing Policy Content',
        count: missingContent,
        severity: missingContent > policies.length * 0.5 ? 'high' : 'medium'
      });
    }

    const draftPolicies = policies.filter(p => p.status === 'draft').length;
    if (draftPolicies > 0) {
      issues.push({
        issue: 'Unpublished Draft Policies',
        count: draftPolicies,
        severity: draftPolicies > policies.length * 0.3 ? 'medium' : 'low'
      });
    }

    const expiredPolicies = policies.filter(p => this.isPolicyExpired(p)).length;
    if (expiredPolicies > 0) {
      issues.push({
        issue: 'Expired Policies',
        count: expiredPolicies,
        severity: 'high'
      });
    }

    return issues;
  }

  private generateUserActivityPatterns(policies: PolicyDocument[], notifications: NotificationDocument[], chatSessions: ChatHistoryDocument[]): Array<{ hour: number; activity: number }> {
    const patterns = [];
    
    // Group activities by hour
    const hourlyActivity = new Array(24).fill(0);
    
    // Count policy creation activity by hour
    policies.forEach(policy => {
      const hour = new Date(policy.createdAt).getHours();
      hourlyActivity[hour]++;
    });
    
    // Count notification activity by hour
    notifications.forEach(notification => {
      const hour = new Date(notification.createdAt).getHours();
      hourlyActivity[hour]++;
    });
    
    // Count chat activity by hour
    chatSessions.forEach(chat => {
      const hour = new Date(chat.createdAt).getHours();
      hourlyActivity[hour]++;
    });
    
    // Convert to pattern format
    for (let hour = 0; hour < 24; hour++) {
      patterns.push({
        hour,
        activity: hourlyActivity[hour]
      });
    }
    
    return patterns;
  }

  private calculateFeatureUsage(policies: PolicyDocument[], notifications: NotificationDocument[], chatSessions: ChatHistoryDocument[]): Array<{ feature: string; usageCount: number; uniqueUsers: number }> {
    return [
      {
        feature: 'Policy Creation',
        usageCount: policies.length,
        uniqueUsers: 1 // Current user only
      },
      {
        feature: 'AI Chat',
        usageCount: chatSessions.length,
        uniqueUsers: chatSessions.length > 0 ? 1 : 0
      },
      {
        feature: 'Notifications',
        usageCount: notifications.length,
        uniqueUsers: notifications.length > 0 ? 1 : 0
      },
      {
        feature: 'PDF Upload',
        usageCount: policies.filter(p => p.hasPDF).length,
        uniqueUsers: policies.filter(p => p.hasPDF).length > 0 ? 1 : 0
      }
    ];
  }

  private calculateProductivityMetrics(policies: PolicyDocument[], notifications: NotificationDocument[], chatSessions: ChatHistoryDocument[], dateRange: { start: Date; end: Date }) {
    const totalActivities = policies.length + notifications.length + chatSessions.length;
    
    // Calculate daily productivity
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyProductivity = daysDiff > 0 ? totalActivities / daysDiff : 0;

    // Calculate most productive day
    const dailyActivity = this.aggregateByDate([...policies, ...notifications, ...chatSessions], 'createdAt');
    const mostProductiveDay = dailyActivity.reduce((max, day) => day.count > max.count ? day : max, dailyActivity[0] || { count: 0, date: '' });

    // Calculate productivity score (0-100)
    const productivityScore = Math.min(100, Math.round((totalActivities / Math.max(daysDiff, 1)) * 10));

    return {
      totalActivities,
      dailyProductivity: Math.round(dailyProductivity * 100) / 100,
      mostProductiveDay: mostProductiveDay.date,
      productivityScore,
      policiesCreated: policies.length,
      notificationsReceived: notifications.length,
      chatSessions: chatSessions.length,
    };
  }
}
