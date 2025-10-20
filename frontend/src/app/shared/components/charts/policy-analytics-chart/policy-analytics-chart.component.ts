import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartComponent, ChartData, ChartOptions } from '../base-chart/base-chart.component';
import { PolicyAnalytics } from '@core/services/analytics.service';

@Component({
  selector: 'app-policy-analytics-chart',
  standalone: true,
  imports: [CommonModule, BaseChartComponent],
  template: `
    <div class="policy-analytics-charts">
      <!-- Policy Status Distribution -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="statusChartData"
          [chartType]="'doughnut'"
          [title]="'analytics.policyStatusDistribution'"
          [chartOptions]="statusChartOptions">
        </app-base-chart>
      </div>

      <!-- Policy Lifecycle Distribution -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="lifecycleChartData"
          [chartType]="'pie'"
          [title]="'analytics.policyLifecycleDistribution'"
          [chartOptions]="lifecycleChartOptions">
        </app-base-chart>
      </div>

      <!-- Policies Over Time -->
      <div class="chart-section full-width">
        <app-base-chart
          [chartData]="overTimeChartData"
          [chartType]="'line'"
          [title]="'analytics.policiesOverTime'"
          [chartOptions]="overTimeChartOptions">
        </app-base-chart>
      </div>

      <!-- Policy Creation Rate -->
      <div class="chart-section">
        <app-base-chart
          [chartData]="creationRateChartData"
          [chartType]="'bar'"
          [title]="'analytics.policyCreationRate'"
          [chartOptions]="creationRateChartOptions">
        </app-base-chart>
      </div>
    </div>
  `,
  styles: [`
    .policy-analytics-charts {
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
export class PolicyAnalyticsChartComponent implements OnInit, OnChanges {
  @Input() analytics: PolicyAnalytics | null = null;

  statusChartData: ChartData | null = null;
  lifecycleChartData: ChartData | null = null;
  overTimeChartData: ChartData | null = null;
  creationRateChartData: ChartData | null = null;

  statusChartOptions: ChartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  lifecycleChartOptions: ChartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  overTimeChartOptions: ChartOptions = {
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
          text: 'Number of Policies'
        },
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    }
  };

  creationRateChartOptions: ChartOptions = {
    scales: {
      y: {
        display: true,
        title: {
          display: true,
          text: 'Policies per Day'
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

    this.updateStatusChart();
    this.updateLifecycleChart();
    this.updateOverTimeChart();
    this.updateCreationRateChart();
  }

  private updateStatusChart(): void {
    if (!this.analytics?.statusDistribution) return;

    this.statusChartData = {
      labels: this.analytics.statusDistribution.map(item => item.status),
      datasets: [{
        label: 'Policies',
        data: this.analytics.statusDistribution.map(item => item.count),
        backgroundColor: [
          '#3b82f6', // Blue for draft
          '#10b981', // Green for published
        ],
        borderColor: [
          '#1d4ed8',
          '#059669',
        ],
        borderWidth: 2
      }]
    };
  }

  private updateLifecycleChart(): void {
    if (!this.analytics?.lifecycleDistribution) return;

    this.lifecycleChartData = {
      labels: this.analytics.lifecycleDistribution.map(item => item.lifecycle),
      datasets: [{
        label: 'Policies',
        data: this.analytics.lifecycleDistribution.map(item => item.count),
        backgroundColor: [
          '#10b981', // Green for active
          '#f59e0b', // Yellow for expiring soon
          '#ef4444', // Red for expired
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

  private updateOverTimeChart(): void {
    if (!this.analytics?.policiesOverTime) return;

    this.overTimeChartData = {
      labels: this.analytics.policiesOverTime.map(item => 
        new Date(item.date).toLocaleDateString()
      ),
      datasets: [
        {
          label: 'New Policies',
          data: this.analytics.policiesOverTime.map(item => item.count),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Cumulative',
          data: this.analytics.policiesOverTime.map(item => item.cumulative),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    };
  }

  private updateCreationRateChart(): void {
    if (!this.analytics) return;

    // Create a simple bar chart showing the average creation rate
    this.creationRateChartData = {
      labels: ['Average Creation Rate'],
      datasets: [{
        label: 'Policies per Day',
        data: [this.analytics.averageCreationRate],
        backgroundColor: '#8b5cf6',
        borderColor: '#7c3aed',
        borderWidth: 2
      }]
    };
  }
}
