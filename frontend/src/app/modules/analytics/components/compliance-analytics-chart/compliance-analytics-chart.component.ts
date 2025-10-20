import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { BaseChartComponent } from '../base-chart/base-chart.component';
import { ChartData, ChartOptions } from 'chart.js';

interface ComplianceAnalytics {
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
  commonIssues: Array<{
    issue: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }>;
}

@Component({
  selector: 'app-compliance-analytics-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe, BaseChartComponent],
  template: `
    <div class="compliance-analytics-charts">
      <!-- Overall Compliance Score -->
      <div class="chart-section score-section">
        <h4 class="chart-subtitle">{{ 'analytics.overallComplianceScore' | translate }}</h4>
        <div class="score-display">
          <div class="score-circle">
            <div class="score-value">{{ (analytics.overallScore * 100).toFixed(0) }}%</div>
            <div class="score-label">{{ 'analytics.complianceScore' | translate }}</div>
          </div>
        </div>
        @if (analytics.overallScore === 0 && analytics.frameworkScores.length === 0) {
          <div class="no-data-message">
            <div class="no-data-icon">📊</div>
            <p>{{ 'analytics.noComplianceData' | translate }}</p>
            <small>{{ 'analytics.runComplianceCheck' | translate }}</small>
          </div>
        } @else if (analytics.overallScore > 0) {
          <div class="score-details">
            <div class="score-breakdown">
              <span class="score-frameworks">{{ analytics.frameworkScores.length }} frameworks analyzed</span>
              <span class="score-trend">
                @if (analytics.complianceTrends && analytics.complianceTrends.length > 1) {
                  {{ 'analytics.trending' | translate }}
                } @else {
                  {{ 'analytics.baseline' | translate }}
                }
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Compliance by Framework -->
      <div class="chart-section">
        <h4 class="chart-subtitle">{{ 'analytics.complianceByFramework' | translate }}</h4>
        <app-base-chart
          [chartData]="frameworkData"
          [chartType]="'bar'"
          [title]="''"
          [chartOptions]="frameworkChartOptions">
        </app-base-chart>
      </div>

      <!-- Compliance Trends -->
      <div class="chart-section full-width">
        <h4 class="chart-subtitle">{{ 'analytics.complianceTrends' | translate }}</h4>
        <app-base-chart
          [chartData]="trendsData"
          [chartType]="'line'"
          [title]="''"
          [chartOptions]="trendsChartOptions">
        </app-base-chart>
      </div>


      <!-- Common Compliance Issues -->
      <div class="chart-section">
        <h4 class="chart-subtitle">{{ 'analytics.commonComplianceIssues' | translate }}</h4>
        <app-base-chart
          [chartData]="issuesData"
          [chartType]="'bar'"
          [title]="''"
          [chartOptions]="issuesChartOptions">
        </app-base-chart>
      </div>
    </div>
  `,
  styles: [`
    .compliance-analytics-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .chart-section {
      background: var(--color-bg-tertiary);
      border-radius: 0.5rem;
      padding: 1rem;
      border: 1px solid var(--color-border-primary);
      height: fit-content;
    }

    .chart-section.full-width {
      grid-column: 1 / -1;
    }

    .chart-section.score-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 180px;
      max-height: 200px;
    }

    .chart-subtitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-display {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: conic-gradient(
        var(--color-success) 0deg,
        var(--color-success) calc(var(--score, 0) * 3.6deg),
        var(--color-border-primary) calc(var(--score, 0) * 3.6deg),
        var(--color-border-primary) 360deg
      );
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .score-circle::before {
      content: '';
      position: absolute;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: var(--color-bg-tertiary);
    }

    .score-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      z-index: 1;
    }

    .score-label {
      font-size: 0.625rem;
      color: var(--color-text-secondary);
      z-index: 1;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .compliance-analytics-charts {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      
      .chart-section {
        padding: 0.75rem;
      }

      .score-circle {
        width: 80px;
        height: 80px;
      }

      .score-circle::before {
        width: 55px;
        height: 55px;
      }

      .score-value {
        font-size: 1rem;
      }
    }

    /* Dark mode support */
    .dark .chart-section {
      background: #374151;
      border-color: #4b5563;
    }

    .dark .chart-subtitle {
      color: #d1d5db;
    }

    .dark .score-circle::before {
      background: #374151;
    }

    .dark .score-value {
      color: #f9fafb;
    }

    .dark .score-label {
      color: #d1d5db;
    }

    .no-data-message {
      margin-top: 1rem;
      text-align: center;
      color: #6b7280;
    }

    .no-data-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .no-data-message p {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .no-data-message small {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .score-details {
      margin-top: 1rem;
      text-align: center;
    }

    .score-breakdown {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .score-frameworks {
      font-weight: 500;
    }

    .score-trend {
      color: #9ca3af;
    }

    .dark .no-data-message {
      color: #d1d5db;
    }

    .dark .no-data-message small {
      color: #9ca3af;
    }

    .dark .score-breakdown {
      color: #d1d5db;
    }

    .dark .score-trend {
      color: #9ca3af;
    }
  `]
})
export class ComplianceAnalyticsChartComponent implements OnInit {
  @Input() analytics!: ComplianceAnalytics;

  frameworkData: ChartData | null = null;
  trendsData: ChartData | null = null;
  issuesData: ChartData | null = null;

  frameworkChartOptions: ChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          callback: function(value) {
            return (Number(value) * 100).toFixed(0) + '%';
          }
        }
      }
    }
  };

  trendsChartOptions: ChartOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        max: 1,
        title: {
          display: true,
          text: 'Average Compliance Score'
        },
        ticks: {
          callback: function(value) {
            return (Number(value) * 100).toFixed(0) + '%';
          }
        }
      }
    }
  };


  issuesChartOptions: ChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  ngOnInit(): void {
    this.prepareChartData();
    this.updateScoreCircle();
  }

  private prepareChartData(): void {
    if (!this.analytics) {
      this.setEmptyData();
      return;
    }

    // Check if we have actual data
    const hasData = this.analytics.frameworkScores && this.analytics.frameworkScores.length > 0;
    
    if (!hasData) {
      this.setEmptyData();
      return;
    }

    // Framework Scores Chart
    this.frameworkData = {
      labels: this.analytics.frameworkScores.map(item => item.framework),
      datasets: [{
        label: 'Compliance Score',
        data: this.analytics.frameworkScores.map(item => item.score),
        backgroundColor: this.analytics.frameworkScores.map(item => this.getScoreColor(item.score)),
        borderColor: this.analytics.frameworkScores.map(item => this.getScoreBorderColor(item.score)),
        borderWidth: 2
      }]
    };

    // Compliance Trends Chart
    const trendLabels = this.analytics.complianceTrends.map(item => item.date);
    this.trendsData = {
      labels: trendLabels,
      datasets: [{
        label: 'Average Compliance Score',
        data: this.analytics.complianceTrends.map(item => item.averageScore),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };


    // Common Issues Chart
    const issueLabels = this.analytics.commonIssues.map(item => item.issue);
    this.issuesData = {
      labels: issueLabels,
      datasets: [{
        label: 'Number of Issues',
        data: this.analytics.commonIssues.map(item => item.count),
        backgroundColor: this.analytics.commonIssues.map(item => {
          switch (item.severity) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#6b7280';
          }
        }),
        borderColor: this.analytics.commonIssues.map(item => {
          switch (item.severity) {
            case 'high': return '#dc2626';
            case 'medium': return '#d97706';
            case 'low': return '#059669';
            default: return '#4b5563';
          }
        }),
        borderWidth: 1
      }]
    };
  }

  private updateScoreCircle(): void {
    if (this.analytics) {
      const scorePercentage = this.analytics.overallScore * 100;
      document.documentElement.style.setProperty('--score', scorePercentage.toString());
    }
  }

  private getScoreColor(score: number): string {
    if (score >= 0.8) return '#10b981'; // Green
    if (score >= 0.6) return '#f59e0b'; // Yellow
    if (score >= 0.4) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }

  private getScoreBorderColor(score: number): string {
    if (score >= 0.8) return '#059669'; // Dark green
    if (score >= 0.6) return '#d97706'; // Dark yellow
    if (score >= 0.4) return '#ea580c'; // Dark orange
    return '#dc2626'; // Dark red
  }

  private setEmptyData(): void {
    // Set empty data for all charts when no analytics data is available
    this.frameworkData = {
      labels: ['No Data'],
      datasets: [{
        label: 'Compliance Score',
        data: [0],
        backgroundColor: '#e5e7eb',
        borderColor: '#9ca3af',
        borderWidth: 1
      }]
    };

    this.trendsData = {
      labels: ['No Data'],
      datasets: [{
        label: 'Average Compliance Score',
        data: [0],
        borderColor: '#e5e7eb',
        backgroundColor: 'rgba(229, 231, 235, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };


    this.issuesData = {
      labels: ['No Data'],
      datasets: [{
        label: 'Issues',
        data: [0],
        backgroundColor: '#e5e7eb',
        borderColor: '#9ca3af',
        borderWidth: 1
      }]
    };
  }
}
