import { Component, Input } from '@angular/core';
import { LeaveRequest } from '../../../core/models/api.models';
import { formatDate, formatDateRange } from '../../utils/date.utils';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [StatusBadgeComponent, EmptyStateComponent],
  template: `
    @if (request; as req) {
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Employee</div>
          <div class="detail-value">{{ req.employee?.fullName || '—' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Leave type</div>
          <div class="detail-value">{{ req.leaveType?.name || '—' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value">{{ formatRange(req.startDate, req.endDate) }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Working days</div>
          <div class="detail-value">{{ req.workingDays }} day{{ req.workingDays === 1 ? '' : 's' }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value"><app-status-badge [status]="req.status" /></div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Submitted</div>
          <div class="detail-value">{{ formatStamp(req.createdAt) }}</div>
        </div>
        <div class="detail-item full">
          <div class="detail-label">Reason</div>
          <div class="detail-value">{{ req.reason }}</div>
        </div>
        @if (req.comment) {
          <div class="detail-item full">
            <div class="detail-label">Latest comment</div>
            <div class="detail-value">{{ req.comment }}</div>
          </div>
        }
      </div>

      @if (req.approvalHistory?.length) {
        <h3 style="margin-top: 20px;">Approval history</h3>
        <ul class="timeline">
          @for (item of req.approvalHistory; track item.id) {
            <li>
              <div class="timeline-action">{{ item.action }}</div>
              <div class="timeline-meta">
                {{ item.actor?.fullName || 'System' }} · {{ formatStamp(item.createdAt) }}
              </div>
              @if (item.comment) {
                <div class="detail-value" style="font-size: 12px; font-weight: 500; margin-top: 3px;">{{ item.comment }}</div>
              }
            </li>
          }
        </ul>
      }
    } @else {
      <app-empty-state title="No request selected" message="Choose a request to view its details." />
    }
  `,
})
export class RequestDetailComponent {
  @Input() request: LeaveRequest | null = null;

  formatRange(start: string, end: string): string {
    return formatDateRange(start, end);
  }

  formatStamp(value: string): string {
    return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}
