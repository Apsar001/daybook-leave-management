import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `
    <div class="chart-frame" [style.height.px]="height">
      <canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas>
    </div>
  `,
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() type: ChartType = 'bar';
  @Input() labels: string[] = [];
  @Input() datasets: ChartConfiguration['data']['datasets'] = [];
  @Input() height = 260;
  @Input() showLegend = false;
  @Input() ariaLabel = 'Chart';

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    const context = this.canvasRef?.nativeElement?.getContext('2d');
    if (!context) {
      return;
    }

    const isRadial = this.type === 'doughnut' || this.type === 'pie';
    const options: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: this.showLegend, position: 'bottom' },
        tooltip: { enabled: true },
      },
    };

    if (!isRadial) {
      options.scales = {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      };
    }

    const config: ChartConfiguration = {
      type: this.type,
      data: { labels: this.labels, datasets: this.datasets },
      options,
    };

    this.chart?.destroy();
    this.chart = new Chart(context, config);
  }
}
