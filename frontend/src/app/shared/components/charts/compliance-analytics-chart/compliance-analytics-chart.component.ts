import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartComponent, ChartData, ChartOptions } from '../base-chart/base-chart.component';
import { ComplianceAnalytics } from '@core/services/analytics.service';

@Component({
  selector: 'app-compliance-analytics-chart',
  standalone: true,
  imports: [CommonModule, BaseChartComponent],
  template: `
    <div class="compliance-analytics-charts">
      <!-- Overall Compliance Score Gauge -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="overallScoreChartData"
          [chartType]="'doughnut'"
          [title]="'analytics.overallComplianceScore'"
          [chartOptions]="overallScoreChartOptions">
        </app-base-chart>
      </div>

      <!-- Framework Scores -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="frameworkScoresChartData"
          [chartType]="'bar'"
          [title]="'analytics.complianceByFramework'"
          [chartOptions]="frameworkScoresChartOptions">
        </app-base-chart>
      </div>

      <!-- Compliance Trends -->
      <div class="chart-section full-width">
        <app-base-chart
          [chartData]="trendsChartData"
          [chartType]="'line'"
          [title]="'analytics.complianceTrends'"
          [chartOptions]="trendsChartOptions">
        </app-base-chart>
      </div>

      <!-- Risk Distribution -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="riskDistributionChartData"
          [chartType]="'pie'"
          [title]="'analytics.riskDistribution'"
          [chartOptions]="riskDistributionChartOptions">
        </app-base-chart>
      </div>

      <!-- Common Issues -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="commonIssuesChartData"
          [chartType]="'bar'"
          [title]="'analytics.commonComplianceIssues'"
          [chartOptions]="commonIssuesChartOptions">
        </app-base-chart>
      </div>
    </div>
  `,
  styles: [`
    .compliance-analytics-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      padding: 1rem;
    }

    .chart-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .chart-section.full-width {
      grid-column: 1 / -1;
    }

    /* Dark mode support */
    .dark .chart-section {
      background: #1f2937;
    }
  `]
})
export class ComplianceAnalyticsChartComponent implements OnInit, OnChanges {
  @Input() analytics: ComplianceAnalytics | null = null;

  overallScoreChartData: ChartData | null = null;
  frameworkScoresChartData: ChartData | null = null;
  trendsChartData: ChartData | null = null;
  riskDistributionChartData: ChartData | null = null;
  commonIssuesChartData: ChartData | null = null;

  overallScoreChartOptions: ChartOptions = {
    plugins: {
      legend: {
        display: false
      }
    }
  };

  frameworkScoresChartOptions: ChartOptions = {
    scales: {
      y: {
        display: true,
        title: {
          display: true,
          text: 'Compliance Score'
        },
        beginAtZero: true
      }
    }
  };

  trendsChartOptions: ChartOptions = {
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Average Score'
        },
        beginAtZero: true
      }
    }
  };

  riskDistributionChartOptions: ChartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  commonIssuesChartOptions: ChartOptions = {
    scales: {
      y: {
        display: true,
        title: {
          display: true,
          text: 'Number of Issues'
        },
        beginAtZero: true
      }
    }
  };

  ngOnInit(): void {
    this.updateCharts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['analytics']) {
      this.updateCharts();
    }
  }

  private updateCharts(): void {
    if (!this.analytics) return;

    this.updateOverallScoreChart();
    this.updateFrameworkScoresChart();
    this.updateTrendsChart();
    this.updateRiskDistributionChart();
    this.updateCommonIssuesChart();
  }

  private updateOverallScoreChart(): void {
    if (!this.analytics?.overallScore) return;

    const score = this.analytics.overallScore;
    const remaining = 1 - score;

    this.overallScoreChartData = {
      labels: ['Compliant', 'Remaining'],
      datasets: [{
        label: 'Compliance Score',
        data: [score, remaining],
        backgroundColor: [
          this.getScoreColor(score),
          '#e5e7eb'
        ],
        borderColor: [
          this.getScoreColor(score),
          '#d1d5db'
        ],
        borderWidth: 2
      }]
    };
  }

  private updateFrameworkScoresChart(): void {
    if (!this.analytics?.frameworkScores) return;

    this.frameworkScoresChartData = {
      labels: this.analytics.frameworkScores.map(item => item.framework),
      datasets: [{
        label: 'Compliance Score',
        data: this.analytics.frameworkScores.map(item => item.score),
        backgroundColor: this.analytics.frameworkScores.map(item => 
          this.getScoreColor(item.score)
        ),
        borderColor: this.analytics.frameworkScores.map(item => 
          this.getScoreColor(item.score, 0.8)
        ),
        borderWidth: 2
      }]
    };
  }

  private updateTrendsChart(): void {
    if (!this.analytics?.complianceTrends) return;

    this.trendsChartData = {
      labels: this.analytics.complianceTrends.map(item => 
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [{
        label: 'Average Compliance Score',
        data: this.analytics.complianceTrends.map(item => item.averageScore),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  private updateRiskDistributionChart(): void {
    if (!this.analytics?.riskDistribution) return;

    this.riskDistributionChartData = {
      labels: this.analytics.riskDistribution.map(item => item.riskLevel),
      datasets: [{
        label: 'Policies',
        data: this.analytics.riskDistribution.map(item => item.count),
        backgroundColor: [
          '#10b981', // Green for low risk
          '#f59e0b', // Yellow for medium risk
          '#ef4444', // Red for high risk
        ],
        borderColor: [
          '#059669',
          '#d97706',
          '#dc2626',
        ],
        borderWidth: 2
      }]
    };
  }

  private updateCommonIssuesChart(): void {
    if (!this.analytics?.commonIssues) return;

    this.commonIssuesChartData = {
      labels: this.analytics.commonIssues.map(item => item.issue),
      datasets: [{
        label: 'Number of Issues',
        data: this.analytics.commonIssues.map(item => item.count),
        backgroundColor: this.analytics.commonIssues.map(item => 
          this.getSeverityColor(item.severity)
        ),
        borderColor: this.analytics.commonIssues.map(item => 
          this.getSeverityColor(item.severity, 0.8)
        ),
        borderWidth: 2
      }]
    };
  }

  private getScoreColor(score: number, alpha: number = 1): string {
    if (score >= 0.8) {
      return `rgba(16, 185, 129, ${alpha})`; // Green
    } else if (score >= 0.6) {
      return `rgba(245, 158, 11, ${alpha})`; // Yellow
    } else {
      return `rgba(239, 68, 68, ${alpha})`; // Red
    }
  }

  private getSeverityColor(severity: string, alpha: number = 1): string {
    switch (severity) {
      case 'high':
        return `rgba(239, 68, 68, ${alpha})`; // Red
      case 'medium':
        return `rgba(245, 158, 11, ${alpha})`; // Yellow
      case 'low':
        return `rgba(16, 185, 129, ${alpha})`; // Green
      default:
        return `rgba(107, 114, 128, ${alpha})`; // Gray
    }
  }
}
