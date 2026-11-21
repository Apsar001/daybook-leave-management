import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  template: `
    <div class="loading-state" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ message }}</span>
    </div>
  `,
})
export class LoadingStateComponent {
  @Input() message = 'Loading data…';
}
