import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { Chart, ChartConfiguration, ChartData, ChartOptions, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="chart-container">
      <div class="chart-header" *ngIf="title && title.trim() !== ''">
        <h3 class="chart-title">{{ title | translate }}</h3>
      </div>
      <div class="chart-wrapper">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .chart-header {
      margin-bottom: 0.75rem;
    }

    .chart-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .chart-wrapper {
      flex: 1;
      position: relative;
      height: 180px;
      min-height: 180px;
      max-height: 220px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    /* Dark mode support */
    .dark .chart-title {
      color: #9ca3af;
    }
  `]
})
export class BaseChartComponent implements OnInit, OnDestroy {
  @Input() chartData: ChartData | null = null;
  @Input() chartType: 'line' | 'bar' | 'doughnut' | 'pie' | 'polarArea' = 'line';
  @Input() title: string = '';
  @Input() chartOptions: ChartOptions = {};

  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngOnInit(): void {
    this.createChart();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    if (!this.chartData || !this.chartCanvas) {
      return;
    }

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const config: ChartConfiguration = {
      type: this.chartType,
      data: this.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom' as const,
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          }
        },
        scales: this.chartType !== 'doughnut' && this.chartType !== 'pie' ? {
          x: {
            display: true,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        } : undefined,
        ...this.chartOptions
      }
    };

    this.chart = new Chart(ctx, config);
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.createChart();
    }
  }
}
