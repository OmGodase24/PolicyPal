import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AnalyticsService, DashboardAnalytics, TimeRange } from '@core/services/analytics.service';
import { PolicyService } from '@core/services/policy.service';
import { AuthService } from '@core/services/auth.service';
import { Policy } from '@core/models/policy.model';
import { PolicyAnalyticsChartComponent } from '../policy-analytics-chart/policy-analytics-chart.component';
import { ComplianceAnalyticsChartComponent } from '../compliance-analytics-chart/compliance-analytics-chart.component';
import { PrivacyDashboardComponent } from '../privacy-dashboard/privacy-dashboard.component';
import { BaseChartComponent } from '../base-chart/base-chart.component';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PolicyAnalyticsChartComponent,
    ComplianceAnalyticsChartComponent,
    PrivacyDashboardComponent,
    BaseChartComponent,
    TranslatePipe
  ],
  template: `
    <div class="analytics-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="header-text">
            <h1 class="dashboard-title">{{ 'analytics.title' | translate }}</h1>
            <p class="dashboard-subtitle">{{ 'analytics.subtitle' | translate }}</p>
          </div>
          <div class="header-actions">
            <select 
              [(ngModel)]="selectedTimeRange" 
              (change)="onTimeRangeChange()"
              class="time-range-select">
              <option value="7d">{{ 'analytics.last7Days' | translate }}</option>
              <option value="30d">{{ 'analytics.last30Days' | translate }}</option>
              <option value="3m">{{ 'analytics.last3Months' | translate }}</option>
              <option value="6m">{{ 'analytics.last6Months' | translate }}</option>
              <option value="1y">{{ 'analytics.lastYear' | translate }}</option>
              <option value="all">{{ 'analytics.allTime' | translate }}</option>
            </select>
            <button (click)="refreshData()" class="refresh-btn" [disabled]="loading">
              <svg class="w-4 h-4" [class.animate-spin]="loading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ 'analytics.refresh' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <span>{{ 'analytics.loading' | translate }}</span>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-state">
        <div class="error-content">
          <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <h3 class="error-title">{{ 'analytics.errorTitle' | translate }}</h3>
          <p class="error-message">{{ error }}</p>
          <button (click)="refreshData()" class="retry-btn">
            {{ 'analytics.retry' | translate }}
          </button>
        </div>
      </div>

      <!-- Analytics Content -->
      <div *ngIf="!loading && !error && analytics" class="analytics-content">
        
        <!-- Personal Analytics Section -->
        <div class="analytics-section personal">
          <div class="section-header">
            <h2 class="section-title">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              {{ 'analytics.personalAnalytics' | translate }}
            </h2>
            <p class="section-subtitle">{{ 'analytics.personalAnalyticsDesc' | translate }}</p>
          </div>

          <!-- Personal Key Metrics -->
          <div class="metrics-grid">
            <div class="metric-card personal">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.yourPolicies' | translate }}</h3>
                <div class="metric-icon policies">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.personal.policies.totalPolicies }}</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {{ analytics.personal.policies.averageCreationRate }} per day
              </div>
            </div>

            <div class="metric-card personal">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.yourCompliance' | translate }}</h3>
                <div class="metric-icon compliance">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ (analytics.personal.compliance.overallScore * 100).toFixed(0) }}%</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {{ 'analytics.complianceScore' | translate }}
              </div>
            </div>

            <div class="metric-card personal">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.yourProductivity' | translate }}</h3>
                <div class="metric-icon productivity">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.personal.personalActivity.productivityMetrics.productivityScore }}</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {{ analytics.personal.personalActivity.productivityMetrics.dailyProductivity }} per day
              </div>
            </div>

            <div class="metric-card personal">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.yourNotifications' | translate }}</h3>
                <div class="metric-icon notifications">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 1 15 0v5z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.personal.notifications.totalNotifications }}</div>
              <div class="metric-change neutral">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                </svg>
                {{ 'analytics.received' | translate }}
              </div>
            </div>
          </div>

          <!-- Personal Policy Analytics Charts -->
          <div class="charts-section">
            <h3 class="subsection-title">{{ 'analytics.policyAnalytics' | translate }}</h3>
            <app-policy-analytics-chart [analytics]="analytics.personal.policies"></app-policy-analytics-chart>
          </div>

          <!-- Personal Compliance Analytics Charts -->
          <div class="charts-section">
            <h3 class="subsection-title">{{ 'analytics.complianceAnalytics' | translate }}</h3>
            <app-compliance-analytics-chart [analytics]="analytics.personal.compliance"></app-compliance-analytics-chart>
          </div>

          <!-- Privacy Dashboard -->
          <div class="charts-section">
            <div class="privacy-header">
              <h3 class="subsection-title">{{ 'privacy.dashboardTitle' | translate }}</h3>
              <div class="policy-selector" *ngIf="availablePolicies.length > 0">
                <label for="policySelect">{{ 'privacy.selectPolicy' | translate }}</label>
                <select 
                  id="policySelect" 
                  [value]="selectedPolicy?._id"
                  (change)="onPolicyChange($event)"
                  class="policy-select">
                  <option 
                    *ngFor="let policy of availablePolicies" 
                    [value]="policy._id">
                    {{ policy.title || 'Untitled Policy' }} ({{ policy.status }})
                  </option>
                </select>
              </div>
            </div>
            <app-privacy-dashboard 
              [piaResult]="privacyData"
              [policyText]="getSelectedPolicyText()"
              [policyId]="getSelectedPolicyId()"
              [userId]="currentUserId || ''">
            </app-privacy-dashboard>
          </div>
        </div>

        <!-- User Activity Section -->
        <div class="analytics-section">
          <div class="section-header">
            <h2 class="section-title">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              {{ 'analytics.userActivity' | translate }}
            </h2>
            <p class="section-subtitle">{{ 'analytics.activityPatterns' | translate }}</p>
          </div>
          <div class="activity-charts">
            <div class="chart-section">
                     <app-base-chart
                       [chartData]="userActivityChartData"
                       [chartType]="'line'"
                       [title]="''"
                       [chartOptions]="userActivityChartOptions">
                     </app-base-chart>
            </div>
            <div class="chart-section">
              <app-base-chart
                [chartData]="featureUsageChartData"
                [chartType]="'bar'"
                [title]="''"
                [chartOptions]="featureUsageChartOptions">
              </app-base-chart>
            </div>
          </div>
        </div>

        <!-- Notification Analytics Section -->
        <div class="analytics-section">
          <div class="section-header">
            <h2 class="section-title">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 1 0-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 1 1 15 0v5z"></path>
              </svg>
              {{ 'analytics.notificationAnalytics' | translate }}
            </h2>
            <p class="section-subtitle">{{ 'analytics.notificationsSent' | translate }}</p>
          </div>
          <div class="notification-charts">
            <div class="chart-section">
                   <app-base-chart
                     [chartData]="notificationEngagementChartData"
                     [chartType]="'line'"
                     [title]="''"
                     [chartOptions]="notificationEngagementChartOptions">
                   </app-base-chart>
            </div>
            <div class="chart-section">
              <app-base-chart
                [chartData]="notificationTypesChartData"
                [chartType]="'doughnut'"
                [title]="''"
                [chartOptions]="notificationTypesChartOptions">
              </app-base-chart>
            </div>
          </div>
        </div>

        <!-- Platform Analytics Section -->
        <div class="analytics-section platform">
          <div class="section-header">
            <h2 class="section-title">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
              {{ 'analytics.platformAnalytics' | translate }}
            </h2>
            <p class="section-subtitle">{{ 'analytics.platformAnalyticsDesc' | translate }}</p>
          </div>

          <!-- Platform Key Metrics -->
          <div class="metrics-grid">
            <div class="metric-card platform">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.totalUsers' | translate }}</h3>
                <div class="metric-icon users">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.platform.systemMetrics.totalUsers }}</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                +{{ analytics.platform.userGrowth.growthRate }}% growth
              </div>
            </div>

            <div class="metric-card platform">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.activeUsers' | translate }}</h3>
                <div class="metric-icon active-users">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.platform.systemMetrics.activeUsers }}</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {{ analytics.platform.systemMetrics.systemHealth.userEngagement.toFixed(1) }}% engagement
              </div>
            </div>

            <div class="metric-card platform">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.totalPolicies' | translate }}</h3>
                <div class="metric-icon policies">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.platform.systemMetrics.totalPolicies }}</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {{ analytics.platform.platformActivity.avgPoliciesPerUser }} per user
              </div>
            </div>

            <div class="metric-card platform">
              <div class="metric-header">
                <h3 class="metric-title">{{ 'analytics.systemHealth' | translate }}</h3>
                <div class="metric-icon health">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="metric-value">{{ analytics.platform.systemMetrics.systemHealth.policyCompletion.toFixed(0) }}%</div>
              <div class="metric-change positive">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {{ 'analytics.policyCompletion' | translate }}
              </div>
            </div>
          </div>

          <!-- Platform Growth Charts -->
          <div class="charts-section">
            <h3 class="subsection-title">{{ 'analytics.userGrowth' | translate }}</h3>
            <div class="growth-charts">
              <div class="chart-section">
                       <app-base-chart
                         [chartData]="userGrowthChartData"
                         [chartType]="'line'"
                         [title]="''"
                         [chartOptions]="userGrowthChartOptions">
                       </app-base-chart>
              </div>
              <div class="chart-section">
                <app-base-chart
                  [chartData]="platformActivityChartData"
                  [chartType]="'bar'"
                  [title]="''"
                  [chartOptions]="platformActivityChartOptions">
                </app-base-chart>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      min-height: 100vh;
      background: var(--color-bg-primary);
    }

    .dashboard-header {
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border-primary);
      padding: 1.5rem 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .dashboard-subtitle {
      color: var(--color-text-secondary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .time-range-select {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border-primary);
      border-radius: 0.375rem;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-size: 0.875rem;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--color-primary);
      color: var(--color-text-inverse);
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 0.875rem;
    }

    .refresh-btn:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .loading-state, .error-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid var(--color-border-primary);
      border-top: 2px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-content {
      text-align: center;
    }

    .error-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-danger);
      margin: 1rem 0 0.5rem 0;
    }

    .error-message {
      color: var(--color-text-secondary);
      margin-bottom: 1rem;
    }

    .retry-btn {
      padding: 0.5rem 1rem;
      background: var(--color-danger);
      color: var(--color-text-inverse);
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .analytics-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .analytics-section {
      margin-bottom: 2.5rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      margin-bottom: 1.5rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .section-subtitle {
      color: var(--color-text-secondary);
      margin: 0;
      font-size: 0.875rem;
    }

    .subsection-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 1.5rem 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--color-bg-tertiary);
      border-radius: 0.5rem;
      padding: 1.5rem;
      border: 1px solid var(--color-border-primary);
      transition: all 0.2s ease;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .metric-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .metric-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon.policies {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    .metric-icon.compliance {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .metric-icon.productivity {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .metric-icon.users {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }

    .metric-icon.active-users {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .metric-icon.health {
      background: var(--color-danger-light);
      color: var(--color-danger);
    }

    .metric-icon.notifications {
      background: var(--color-info-light);
      color: var(--color-info);
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin-bottom: 0.5rem;
    }

    .metric-change {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .metric-change.positive {
      color: var(--color-success);
    }

    .metric-change.neutral {
      color: var(--color-text-secondary);
    }

    .charts-section {
      margin-bottom: 1.5rem;
    }

    .activity-charts, .notification-charts, .growth-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1rem;
    }

    .chart-section {
      background: var(--color-bg-tertiary);
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--color-border-primary);
      padding: 1rem;
      height: fit-content;
      position: relative;
    }

    .chart-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--color-primary), var(--color-success));
      border-radius: 0.5rem 0.5rem 0 0;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .analytics-content {
        padding: 1rem;
      }

      .analytics-section {
        padding: 1rem;
        margin-bottom: 2rem;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .activity-charts, .notification-charts, .growth-charts {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .chart-section {
        padding: 0.75rem;
      }
    }

    .privacy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .policy-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .policy-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border-primary);
      border-radius: 0.5rem;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      min-width: 260px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .policy-select option {
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
    }

    .dark .policy-select {
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      border-color: var(--color-border-primary);
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  analytics: DashboardAnalytics | null = null;
  loading = false;
  error: string | null = null;
  selectedTimeRange: TimeRange = TimeRange.LAST_30_DAYS;

  // Privacy Dashboard Data
  privacyData: any = null;
  selectedPolicy: Policy | null = null;
  currentUserId: string = '';
  availablePolicies: Policy[] = [];

  // Personal Analytics Charts
  userActivityChartData: ChartData | null = null;
  featureUsageChartData: ChartData | null = null;
  notificationEngagementChartData: ChartData | null = null;
  notificationTypesChartData: ChartData | null = null;

  // Platform Analytics Charts
  userGrowthChartData: ChartData | null = null;
  platformActivityChartData: ChartData | null = null;

         userActivityChartOptions: ChartOptions = {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: false
             }
           },
           scales: {
             x: {
               display: true,
               grid: {
                 display: false
               }
             },
             y: {
               display: true,
               beginAtZero: true,
               grid: {
                 display: false
               }
             }
           }
         };

         featureUsageChartOptions: ChartOptions = {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: false
             }
           },
           scales: {
             y: {
               display: true,
               beginAtZero: true,
               grid: {
                 display: false
               }
             }
           }
         };

         notificationEngagementChartOptions: ChartOptions = {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: false
             }
           },
           scales: {
             x: {
               display: true,
               grid: {
                 display: false
               }
             },
             y: {
               display: true,
               beginAtZero: true,
               grid: {
                 display: false
               }
             }
           }
         };

         notificationTypesChartOptions: ChartOptions = {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: true,
               position: 'bottom'
             }
           }
         };

         // Platform Analytics Chart Options
         userGrowthChartOptions: ChartOptions = {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: false
             }
           },
           scales: {
             x: {
               display: true,
               grid: {
                 display: false
               }
             },
             y: {
               display: true,
               beginAtZero: true,
               grid: {
                 display: false
               }
             }
           }
         };

         platformActivityChartOptions: ChartOptions = {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: false
             }
           },
           scales: {
             y: {
               display: true,
               beginAtZero: true,
               grid: {
                 display: false
               }
             }
           }
         };

  private subscriptions: Subscription[] = [];

  constructor(
    private analyticsService: AnalyticsService,
    private policyService: PolicyService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadPolicies();
    this.getCurrentUser();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onTimeRangeChange(): void {
    this.loadAnalytics();
  }

  refreshData(): void {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.loading = true;
    this.error = null;

    this.subscriptions.push(
      this.analyticsService.getDashboardAnalytics(this.selectedTimeRange).subscribe({
        next: (analytics) => {
          this.analytics = analytics;
          this.updateAdditionalCharts();
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load analytics:', error);
          this.error = 'Failed to load analytics data. Please try again.';
          this.loading = false;
        }
      })
    );
  }

  private updateAdditionalCharts(): void {
    if (!this.analytics) return;

    // Personal Analytics Charts
    this.updatePersonalCharts();
    
    // Platform Analytics Charts
    this.updatePlatformCharts();
  }

  private updatePersonalCharts(): void {
    if (!this.analytics?.personal) return;

    // Personal Activity Chart
    this.userActivityChartData = {
      labels: this.analytics.personal.personalActivity.activityPatterns.map((item: { hour: number; activity: number }) => 
        `${item.hour}:00`
      ),
      datasets: [{
        label: 'Your Activity',
        data: this.analytics.personal.personalActivity.activityPatterns.map((item: { hour: number; activity: number }) => item.activity),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // Feature Usage Chart
    this.featureUsageChartData = {
      labels: this.analytics.personal.personalActivity.featureUsage.map((item: { feature: string; usageCount: number; uniqueUsers: number }) => item.feature),
      datasets: [{
        label: 'Your Usage',
        data: this.analytics.personal.personalActivity.featureUsage.map((item: { feature: string; usageCount: number; uniqueUsers: number }) => item.usageCount),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444'
        ]
      }]
    };

    // Notification Engagement Chart
    this.notificationEngagementChartData = {
      labels: this.analytics.personal.notifications.engagementOverTime.map((item: { date: string; sent: number; read: number; engagementRate: number }) => 
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [{
        label: 'Your Engagement Rate (%)',
        data: this.analytics.personal.notifications.engagementOverTime.map((item: { date: string; sent: number; read: number; engagementRate: number }) => item.engagementRate),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // Notification Types Chart
    this.notificationTypesChartData = {
      labels: this.analytics.personal.notifications.typeDistribution.map((item: { type: string; count: number; percentage: number }) => item.type),
      datasets: [{
        label: 'Notifications',
        data: this.analytics.personal.notifications.typeDistribution.map((item: { type: string; count: number; percentage: number }) => item.count),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6'
        ]
      }]
    };
  }

  private updatePlatformCharts(): void {
    if (!this.analytics?.platform) return;

    // User Growth Chart
    this.userGrowthChartData = {
      labels: this.analytics.platform.userGrowth.newUsersOverTime.map((item: { date: string; count: number; cumulative: number }) => 
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [{
        label: 'New Users',
        data: this.analytics.platform.userGrowth.newUsersOverTime.map((item: { date: string; count: number; cumulative: number }) => item.count),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // Platform Activity Chart
    this.platformActivityChartData = {
      labels: ['Policies', 'Notifications', 'Chat Sessions'],
      datasets: [{
        label: 'Platform Activity',
        data: [
          this.analytics.platform.platformActivity.totalPolicies,
          this.analytics.platform.platformActivity.totalNotifications,
          this.analytics.platform.platformActivity.totalChatSessions
        ],
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b'
        ]
      }]
    };
  }

  private loadPolicies(): void {
    this.subscriptions.push(
      this.policyService.getMyPolicies().subscribe({
        next: (policies: Policy[]) => {
          this.availablePolicies = policies;
          // Select the first policy by default
          if (policies.length > 0) {
            this.selectedPolicy = policies[0];
          }
        },
        error: (error: any) => {
          console.error('Failed to load policies:', error);
        }
      })
    );
  }

  private getCurrentUser(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user._id;
    }
  }

  onPolicyChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const policyId = target.value;
    this.selectedPolicy = this.availablePolicies.find(p => p._id === policyId) || null;
  }

  getSelectedPolicyText(): string {
    if (!this.selectedPolicy) return '';
    return this.selectedPolicy.content || this.selectedPolicy.pdfText || '';
  }

  getSelectedPolicyId(): string {
    if (!this.selectedPolicy) return '';
    return this.selectedPolicy._id || '';
  }
}
