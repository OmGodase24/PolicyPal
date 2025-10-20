import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { BaseChartComponent } from '../base-chart/base-chart.component';
import { ChartData, ChartOptions } from 'chart.js';

interface PolicyAnalytics {
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

@Component({
  selector: 'app-policy-analytics-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe, BaseChartComponent],
  template: `
    <div class="policy-analytics-charts">
      <!-- Policy Status Distribution -->
      <div class="chart-section">
        <h4 class="chart-subtitle">{{ 'analytics.policyStatusDistribution' | translate }}</h4>
        <app-base-chart
          [chartData]="statusDistributionData"
          [chartType]="'doughnut'"
          [title]="''"
          [chartOptions]="statusChartOptions">
        </app-base-chart>
      </div>

      <!-- Policy Lifecycle Distribution -->
      <div class="chart-section">
        <h4 class="chart-subtitle">{{ 'analytics.policyLifecycleDistribution' | translate }}</h4>
        <app-base-chart
          [chartData]="lifecycleDistributionData"
          [chartType]="'bar'"
          [title]="''"
          [chartOptions]="lifecycleChartOptions">
        </app-base-chart>
      </div>

      <!-- Policies Over Time -->
      <div class="chart-section full-width">
        <h4 class="chart-subtitle">{{ 'analytics.policiesOverTime' | translate }}</h4>
        <app-base-chart
          [chartData]="policiesOverTimeData"
          [chartType]="'line'"
          [title]="''"
          [chartOptions]="policiesOverTimeOptions">
        </app-base-chart>
      </div>

      <!-- Policy Creation Rate -->
      <div class="chart-section full-width">
        <h4 class="chart-subtitle">{{ 'analytics.policyCreationRate' | translate }}</h4>
        <app-base-chart
          [chartData]="creationRateData"
          [chartType]="'bar'"
          [title]="''"
          [chartOptions]="creationRateOptions">
        </app-base-chart>
      </div>
    </div>
  `,
  styles: [`
    .policy-analytics-charts {
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

    .chart-subtitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .policy-analytics-charts {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      
      .chart-section {
        padding: 0.75rem;
      }
    }

  `]
})
export class PolicyAnalyticsChartComponent implements OnInit {
  @Input() analytics!: PolicyAnalytics;

  statusDistributionData: ChartData | null = null;
  lifecycleDistributionData: ChartData | null = null;
  policiesOverTimeData: ChartData | null = null;
  creationRateData: ChartData | null = null;

  statusChartOptions: ChartOptions = {
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  lifecycleChartOptions: ChartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  policiesOverTimeOptions: ChartOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Policies'
        }
      }
    }
  };

  creationRateOptions: ChartOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Policies per Day'
        }
      }
    }
  };

  ngOnInit(): void {
    this.prepareChartData();
  }

  private prepareChartData(): void {
    if (!this.analytics) return;

    // Status Distribution Chart
    this.statusDistributionData = {
      labels: this.analytics.statusDistribution.map(item => item.status),
      datasets: [{
        data: this.analytics.statusDistribution.map(item => item.count),
        backgroundColor: [
          '#f59e0b', // Amber for draft
          '#10b981', // Green for published
          '#6b7280', // Gray for archived
          '#ef4444', // Red for expired
          '#8b5cf6'  // Purple for expiring
        ],
        borderWidth: 0
      }]
    };

    // Lifecycle Distribution Chart
    this.lifecycleDistributionData = {
      labels: this.analytics.lifecycleDistribution.map(item => item.lifecycle),
      datasets: [{
        label: 'Policies',
        data: this.analytics.lifecycleDistribution.map(item => item.count),
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1
      }]
    };

    // Policies Over Time Chart
    const labels = this.analytics.policiesOverTime.map(item => item.date);
    this.policiesOverTimeData = {
      labels,
      datasets: [
        {
          label: 'New Policies',
          data: this.analytics.policiesOverTime.map(item => item.count),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Cumulative',
          data: this.analytics.policiesOverTime.map(item => item.cumulative),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    };

    // Creation Rate Chart - Using average creation rate as a single value
    this.creationRateData = {
      labels: ['Average Creation Rate'],
      datasets: [{
        label: 'Policies per Day',
        data: [this.analytics.averageCreationRate],
        backgroundColor: '#8b5cf6',
        borderColor: '#7c3aed',
        borderWidth: 1
      }]
    };
  }
}
