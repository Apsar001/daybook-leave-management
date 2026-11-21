import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      @for (toast of notifications.toasts(); track toast.id) {
        <div class="toast" [class.success]="toast.kind === 'success'" [class.error]="toast.kind === 'error'" [class.warning]="toast.kind === 'warning'">
          <span class="toast-message">{{ toast.message }}</span>
          <button type="button" (click)="notifications.dismiss(toast.id)" [attr.aria-label]="'Dismiss notification'">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly notifications = inject(NotificationService);
}
