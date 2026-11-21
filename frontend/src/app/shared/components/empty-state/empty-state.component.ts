import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="empty-state">
      <app-icon [name]="icon" [size]="28" />
      <strong>{{ title }}</strong>
      <span>{{ message }}</span>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = 'Data will appear once it is available.';
  @Input() icon = 'info';
}
