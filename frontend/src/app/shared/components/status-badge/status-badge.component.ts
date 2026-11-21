import { Component, Input } from '@angular/core';
import { RequestStatus } from '../../../core/models/api.models';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="status-badge"
      [class.status-PENDING]="status === 'PENDING'"
      [class.status-APPROVED]="status === 'APPROVED'"
      [class.status-REJECTED]="status === 'REJECTED'"
      [class.status-CANCELLED]="status === 'CANCELLED'"
    >
      {{ label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: RequestStatus;

  get label(): string {
    switch (this.status) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }
}
