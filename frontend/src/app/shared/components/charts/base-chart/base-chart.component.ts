import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { TranslatePipe } from '@core/pipes/translate.pipe';

// Register Chart.js components
Chart.register(...registerables);

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }>;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display?: boolean;
      text?: string;
    };
    tooltip?: {
      enabled?: boolean;
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
    y?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
      beginAtZero?: boolean;
    };
  };
}

@Component({
  selector: 'app-base-chart',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="chart-container">
      <div class="chart-header" *ngIf="title">
        <h3 class="chart-title">{{ title | translate }}</h3>
        <div class="chart-actions">
          <button 
            class="chart-action-btn" 
            (click)="downloadChart()"
            title="Download Chart">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </button>
          <button 
            class="chart-action-btn" 
            (click)="toggleFullscreen()"
            title="Toggle Fullscreen">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="chart-wrapper" [class.fullscreen]="isFullscreen">
        <canvas #chartCanvas></canvas>
      </div>
      <div class="chart-footer" *ngIf="showFooter">
        <div class="chart-legend" *ngIf="showLegend">
          <div 
            *ngFor="let dataset of chartData?.datasets; let i = index" 
            class="legend-item">
            <div 
              class="legend-color" 
              [style.background-color]="getDatasetColor(i)">
            </div>
            <span class="legend-label">{{ dataset.label }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .chart-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .chart-actions {
      display: flex;
      gap: 0.5rem;
    }

    .chart-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
    }

    .chart-action-btn:hover {
      background: #f3f4f6;
      color: #374151;
      border-color: #9ca3af;
    }

    .chart-wrapper {
      position: relative;
      height: 300px;
      padding: 1rem;
    }

    .chart-wrapper.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: white;
      padding: 2rem;
    }

    .chart-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legend-color {
      width: 1rem;
      height: 1rem;
      border-radius: 0.25rem;
    }

    .legend-label {
      font-size: 0.875rem;
      color: #6b7280;
    }

    /* Dark mode support */
    .dark .chart-container {
      background: #1f2937;
      color: #f9fafb;
    }

    .dark .chart-header {
      background: #374151;
      border-color: #4b5563;
    }

    .dark .chart-title {
      color: #f9fafb;
    }

    .dark .chart-action-btn {
      background: #374151;
      border-color: #4b5563;
      color: #d1d5db;
    }

    .dark .chart-action-btn:hover {
      background: #4b5563;
      color: #f9fafb;
    }

    .dark .chart-footer {
      background: #374151;
      border-color: #4b5563;
    }

    .dark .legend-label {
      color: #d1d5db;
    }
  `]
})
export class BaseChartComponent implements OnInit, OnChanges {
  @Input() chartData: ChartData | null = null;
  @Input() chartOptions: ChartOptions = {};
  @Input() chartType: ChartType = 'line';
  @Input() title: string = '';
  @Input() showFooter: boolean = true;
  @Input() showLegend: boolean = true;
  @Input() height: number = 300;

  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  chart: Chart | null = null;
  isFullscreen = false;

  private readonly colorPalette = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#6b7280', // Gray
  ];

  ngOnInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] || changes['chartOptions'] || changes['chartType']) {
      this.updateChart();
    }
  }

  private createChart(): void {
    if (!this.chartCanvas || !this.chartData) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: this.chartType,
      data: this.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...this.chartOptions,
        plugins: {
          legend: {
            display: false, // We handle legend manually
            ...this.chartOptions.plugins?.legend
          },
          ...this.chartOptions.plugins
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart) {
      this.createChart();
      return;
    }

    if (this.chartData) {
      this.chart.data = this.chartData;
      this.chart.options = {
        ...this.chart.options,
        ...this.chartOptions
      };
      this.chart.update();
    }
  }

  getDatasetColor(index: number): string {
    if (this.chartData?.datasets[0]?.backgroundColor) {
      const colors = this.chartData.datasets[0].backgroundColor;
      if (Array.isArray(colors)) {
        return colors[index % colors.length];
      }
      return colors as string;
    }
    return this.colorPalette[index % this.colorPalette.length];
  }

  downloadChart(): void {
    if (!this.chart) return;

    const url = this.chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `${this.title || 'chart'}.png`;
    link.href = url;
    link.click();
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    setTimeout(() => {
      if (this.chart) {
        this.chart.resize();
      }
    }, 100);
  }
}
