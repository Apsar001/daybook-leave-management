import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LeaveRequest } from '../../../core/models/api.models';
import { ManagerService } from '../../../core/services/manager.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { RequestDetailComponent } from '../../../shared/components/request-detail/request-detail.component';
import { formatDateRange } from '../../../shared/utils/date.utils';

interface ApprovalAction {
  request: LeaveRequest;
  kind: 'approve' | 'reject';
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ConfirmDialogComponent,
    DataTableComponent,
    ModalComponent,
    PageHeaderComponent,
    RequestDetailComponent,
  ],
  template: `
    <app-page-header title="Approvals" subtitle="Review and decide on leave requests from your team." />

    <section class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Pending requests</div>
          <div class="card-subtitle">{{ filteredRequests().length }} request(s) awaiting review</div>
        </div>
        <div class="filters">
          <input class="form-control" type="search" [formControl]="search" placeholder="Search employee or leave type" aria-label="Search pending requests" />
        </div>
      </div>
      <div class="card-body">
        <app-data-table
          [loading]="loading()"
          [empty]="!filteredRequests().length"
          emptyTitle="No pending requests"
          emptyMessage="Your team is all caught up."
          emptyIcon="check"
          [error]="errorMessage()"
        >
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave type</th>
                <th>Dates</th>
                <th>Working days</th>
                <th>Reason</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (request of filteredRequests(); track request.id) {
                <tr>
                  <td>
                    <div class="cell-primary">{{ request.employee?.fullName }}</div>
                    <div class="cell-muted">{{ request.employee?.teamName || 'Team' }}</div>
                  </td>
                  <td>
                    <span class="chip"><span class="color-dot" [style.background]="request.leaveType?.color || '#4f46e5'"></span>{{ request.leaveType?.name }}</span>
                  </td>
                  <td class="cell-muted nowrap">{{ range(request.startDate, request.endDate) }}</td>
                  <td>{{ request.workingDays }}</td>
                  <td class="cell-muted" style="max-width: 260px;">{{ request.reason }}</td>
                  <td>
                    <div class="table-actions">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openDetail(request)">Review</button>
                      <button type="button" class="btn btn-primary btn-sm" (click)="askAction(request, 'approve')">Approve</button>
                      <button type="button" class="btn btn-danger btn-sm" (click)="askAction(request, 'reject')">Reject</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </app-data-table>
      </div>
    </section>

    <app-modal [open]="!!selectedRequest()" title="Request review" [wide]="true" (closed)="selectedRequest.set(null)">
      <div modal-body><app-request-detail [request]="selectedRequest()" /></div>
      <div modal-footer>
        @if (selectedRequest(); as request) {
          <button type="button" class="btn btn-danger" (click)="askAction(request, 'reject')">Reject</button>
          <button type="button" class="btn btn-primary" (click)="askAction(request, 'approve')">Approve</button>
        }
        <button type="button" class="btn btn-secondary" (click)="selectedRequest.set(null)">Close</button>
      </div>
    </app-modal>

    <app-confirm-dialog
      [open]="!!action()"
      [title]="action()?.kind === 'reject' ? 'Reject this request?' : 'Approve this request?'"
      [message]="actionMessage()"
      [confirmLabel]="action()?.kind === 'reject' ? 'Reject request' : 'Approve request'"
      [danger]="action()?.kind === 'reject'"
      [requireComment]="action()?.kind === 'reject'"
      [allowComment]="true"
      (confirmed)="applyAction($event)"
      (cancelled)="action.set(null)"
    />
  `,
})
export class ApprovalsComponent {
  private readonly managerService = inject(ManagerService);
  private readonly notifications = inject(NotificationService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly searchTerm = signal('');
  readonly requests = signal<LeaveRequest[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedRequest = signal<LeaveRequest | null>(null);
  readonly action = signal<ApprovalAction | null>(null);

  readonly filteredRequests = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.requests();
    }
    return this.requests().filter((request) =>
      `${request.employee?.fullName} ${request.leaveType?.name} ${request.reason}`.toLowerCase().includes(term),
    );
  });

  readonly actionMessage = computed(() => {
    const current = this.action();
    if (!current) {
      return '';
    }
    return `${current.request.employee?.fullName} · ${current.request.leaveType?.name} · ${formatDateRange(current.request.startDate, current.request.endDate)}`;
  });

  constructor() {
    this.load();
    this.search.valueChanges.subscribe((value) => this.searchTerm.set(value));
  }

  load(): void {
    this.loading.set(true);
    this.managerService.getPendingRequests().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not load approvals.');
        this.requests.set([]);
        this.loading.set(false);
      },
    });
  }

  openDetail(request: LeaveRequest): void {
    this.selectedRequest.set(request);
  }

  askAction(request: LeaveRequest, kind: 'approve' | 'reject'): void {
    this.selectedRequest.set(null);
    this.action.set({ request, kind });
  }

  applyAction(comment: string): void {
    const current = this.action();
    if (!current) {
      return;
    }
    const request$ =
      current.kind === 'approve'
        ? this.managerService.approve(current.request.id, comment)
        : this.managerService.reject(current.request.id, comment);

    request$.subscribe({
      next: (updated) => {
        this.requests.update((items) => items.filter((item) => item.id !== updated.id));
        this.action.set(null);
        this.notifications.success(`Request ${current.kind === 'approve' ? 'approved' : 'rejected'}.`);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.notifications.error(error.messages?.join(' ') || error.message || 'Could not update the request.');
        this.action.set(null);
      },
    });
  }

  range(start: string, end: string): string {
    return formatDateRange(start, end);
  }
}
