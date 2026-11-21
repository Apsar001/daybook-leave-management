import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LeaveRequest, RequestStatus } from '../../../core/models/api.models';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RequestDetailComponent } from '../../../shared/components/request-detail/request-detail.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { formatDateRange, isFutureDate } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ConfirmDialogComponent,
    DataTableComponent,
    IconComponent,
    ModalComponent,
    PageHeaderComponent,
    RequestDetailComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="My requests" subtitle="Track and manage every leave request you have submitted.">
      <a class="btn btn-primary" routerLink="/employee/apply-leave"><app-icon name="plus" [size]="16" /> New request</a>
    </app-page-header>

    <section class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Request history</div>
          <div class="card-subtitle">{{ requests().length }} request(s) found</div>
        </div>
        <form class="filters" [formGroup]="filters">
          <select class="form-control" formControlName="status" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input class="form-control" type="number" formControlName="year" aria-label="Filter by year" min="2000" max="2100" />
        </form>
      </div>
      <div class="card-body">
        <app-data-table
          [loading]="loading()"
          [empty]="!requests().length"
          emptyTitle="No requests found"
          emptyMessage="Try a different filter or apply for leave."
          [error]="errorMessage()"
        >
          <table class="data-table">
            <thead>
              <tr>
                <th>Leave type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (request of requests(); track request.id) {
                <tr>
                  <td class="cell-primary">{{ request.leaveType?.name }}</td>
                  <td class="cell-muted nowrap">{{ range(request.startDate, request.endDate) }}</td>
                  <td>{{ request.workingDays }}</td>
                  <td><app-status-badge [status]="request.status" /></td>
                  <td class="cell-muted nowrap">{{ shortDate(request.createdAt) }}</td>
                  <td>
                    <div class="table-actions">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openDetail(request)">Details</button>
                      @if (canCancel(request)) {
                        <button type="button" class="btn btn-danger btn-sm" (click)="askCancel(request)">Cancel</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </app-data-table>
      </div>
    </section>

    <app-modal [open]="!!selectedRequest()" title="Request details" (closed)="selectedRequest.set(null)">
      <div modal-body><app-request-detail [request]="selectedRequest()" /></div>
      <div modal-footer>
        <button type="button" class="btn btn-secondary" (click)="selectedRequest.set(null)">Close</button>
      </div>
    </app-modal>

    <app-confirm-dialog
      [open]="!!cancelTarget()"
      title="Cancel leave request?"
      [message]="'This will cancel your ' + (cancelTarget()?.leaveType?.name || 'leave') + ' request. This action cannot be undone.'"
      confirmLabel="Cancel request"
      [danger]="true"
      [requireComment]="false"
      commentLabel="Reason for cancellation (optional)"
      (confirmed)="confirmCancel($event)"
      (cancelled)="cancelTarget.set(null)"
    />
  `,
})
export class MyRequestsComponent implements OnInit {
  private readonly requestService = inject(LeaveRequestService);
  private readonly notifications = inject(NotificationService);

  readonly filters = new FormGroup({
    status: new FormControl<RequestStatus | ''>('', { nonNullable: true }),
    year: new FormControl(String(new Date().getFullYear()), { nonNullable: true }),
  });

  readonly requests = signal<LeaveRequest[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedRequest = signal<LeaveRequest | null>(null);
  readonly cancelTarget = signal<LeaveRequest | null>(null);

  ngOnInit(): void {
    this.load();
    this.filters.valueChanges.subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const { status, year } = this.filters.getRawValue();
    this.requestService.list({ status, year: Number(year) || undefined }).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not load requests.');
        this.requests.set([]);
        this.loading.set(false);
      },
    });
  }

  openDetail(request: LeaveRequest): void {
    this.selectedRequest.set(request);
  }

  askCancel(request: LeaveRequest): void {
    this.cancelTarget.set(request);
  }

  confirmCancel(comment: string): void {
    const target = this.cancelTarget();
    if (!target) {
      return;
    }
    this.requestService.cancel(target.id, comment).subscribe({
      next: (updated) => {
        this.requests.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        this.selectedRequest.update((current) => (current?.id === updated.id ? updated : current));
        this.cancelTarget.set(null);
        this.notifications.success('Request cancelled.');
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.cancelTarget.set(null);
        this.notifications.error(error.messages?.join(' ') || error.message || 'Could not cancel request.');
      },
    });
  }

  canCancel(request: LeaveRequest): boolean {
    return request.status === 'PENDING' || (request.status === 'APPROVED' && isFutureDate(request.startDate));
  }

  range(start: string, end: string): string {
    return formatDateRange(start, end);
  }

  shortDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
  }
}
