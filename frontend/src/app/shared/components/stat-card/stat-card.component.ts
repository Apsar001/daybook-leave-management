import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="stat-card">
      <div>
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value">{{ value }}</div>
        @if (hint) {
          <div class="stat-hint">{{ hint }}</div>
        }
      </div>
      <span
        class="stat-icon"
        [class.success]="tone === 'success'"
        [class.warning]="tone === 'warning'"
        [class.danger]="tone === 'danger'"
        [class.info]="tone === 'info'"
      >
        <app-icon [name]="icon" [size]="19" />
      </span>
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = 0;
  @Input() icon = 'info';
  @Input() hint = '';
  @Input() tone: StatTone = 'primary';
}
