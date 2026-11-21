import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CalendarMonth, LeaveRequest, TeamAvailability, TeamMember } from '../../../core/models/api.models';
import { CalendarService } from '../../../core/services/calendar.service';
import { ManagerService } from '../../../core/services/manager.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { formatDate, formatDateRange, monthName, todayIso } from '../../../shared/utils/date.utils';

interface BalanceSummary {
  name: string;
  allowanceDays: number;
  approvedDays: number;
  pendingDays: number;
  availableDays: number;
}

interface PendingAction {
  request: LeaveRequest;
  kind: 'approve' | 'reject';
}

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ChartComponent,
    ConfirmDialogComponent,
    IconComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatCardComponent,
  ],
  template: `
    <app-page-header title="Manager dashboard" subtitle="Your team's leave picture at a glance.">
      <a class="btn btn-secondary" routerLink="/manager/approvals"><app-icon name="approvals" [size]="16" /> All approvals</a>
      <a class="btn btn-primary" routerLink="/manager/calendar"><app-icon name="calendar" [size]="16" /> Team calendar</a>
    </app-page-header>

    @if (loading()) {
      <div class="card"><app-loading-state message="Preparing team overview…" /></div>
    } @else {
      <div class="stat-grid">
        <app-stat-card label="Team size" [value]="team().length" icon="team" tone="primary" hint="Members reporting to you" />
        <app-stat-card label="Pending approvals" [value]="pending().length" icon="clock" tone="warning" hint="Need your decision" />
        <app-stat-card label="Approved requests" [value]="approvedCount()" icon="check" tone="success" hint="This year" />
        <app-stat-card label="Rejected requests" [value]="rejectedCount()" icon="x" tone="danger" hint="This year" />
      </div>

      <div class="grid grid-2" style="margin-bottom: 18px;">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Pending approvals</div>
              <div class="card-subtitle">Requests waiting for your review</div>
            </div>
            <a class="btn btn-ghost btn-sm" routerLink="/manager/approvals">View all</a>
          </div>
          <div class="card-body">
            @if (pending().length) {
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Employee</th><th>Leave</th><th>Dates</th><th>Days</th><th style="text-align: right;">Action</th></tr></thead>
                  <tbody>
                    @for (request of pending().slice(0, 5); track request.id) {
                      <tr>
                        <td class="cell-primary">{{ request.employee?.fullName }}</td>
                        <td>{{ request.leaveType?.name }}</td>
                        <td class="cell-muted nowrap">{{ range(request.startDate, request.endDate) }}</td>
                        <td>{{ request.workingDays }}</td>
                        <td>
                          <div class="table-actions">
                            <button type="button" class="btn btn-primary btn-sm" (click)="askAction(request, 'approve')">Approve</button>
                            <button type="button" class="btn btn-secondary btn-sm" (click)="askAction(request, 'reject')">Reject</button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><strong>All caught up</strong><span>There are no requests awaiting approval.</span></div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Availability today</div>
              <div class="card-subtitle">{{ todayLabel() }}</div>
            </div>
          </div>
          <div class="card-body">
            <app-chart
              type="doughnut"
              [labels]="['Available', 'On leave', 'Pending']"
              [datasets]="availabilityDatasets()"
              [height]="220"
              [showLegend]="true"
              ariaLabel="Team availability today"
            />
            <p class="form-hint" style="text-align: center; margin-top: 8px;">
              {{ availability()?.available || 0 }} of {{ availability()?.teamSize || 0 }} team members available
            </p>
          </div>
        </section>
      </div>

      <div class="grid grid-main-side">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Team balance summary</div>
              <div class="card-subtitle">Aggregated leave balances across your team</div>
            </div>
            <a class="btn btn-ghost btn-sm" routerLink="/manager/team">Open team</a>
          </div>
          <div class="card-body">
            @if (balanceSummary().length) {
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Leave type</th><th>Allowance</th><th>Approved</th><th>Pending</th><th>Available</th></tr></thead>
                  <tbody>
                    @for (row of balanceSummary(); track row.name) {
                      <tr>
                        <td class="cell-primary">{{ row.name }}</td>
                        <td>{{ row.allowanceDays }}</td>
                        <td>{{ row.approvedDays }}</td>
                        <td>{{ row.pendingDays }}</td>
                        <td><span class="badge success">{{ row.availableDays }} days</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><strong>No balance data</strong><span>Balances will appear once your team is configured.</span></div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">{{ monthLabel() }} preview</div>
              <div class="card-subtitle">Team holidays and upcoming leave</div>
            </div>
          </div>
          <div class="card-body">
            @if (calendarPreview().length) {
              <div style="display: flex; flex-direction: column; gap: 9px;">
                @for (item of calendarPreview(); track item.key) {
                  <div style="border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <div class="cell-primary" style="font-size: 12px;">{{ item.title }}</div>
                    <div class="cell-muted">{{ item.subtitle }}</div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state"><strong>Quiet month</strong><span>No leave or holidays recorded.</span></div>
            }
          </div>
        </section>
      </div>
    }

    <app-confirm-dialog
      [open]="!!action()"
      [title]="action()?.kind === 'reject' ? 'Reject request?' : 'Approve request?'"
      [message]="actionMessage()"
      [confirmLabel]="action()?.kind === 'reject' ? 'Reject' : 'Approve'"
      [danger]="action()?.kind === 'reject'"
      [requireComment]="action()?.kind === 'reject'"
      [allowComment]="true"
      commentLabel="Comment"
      (confirmed)="applyAction($event)"
      (cancelled)="action.set(null)"
    />
  `,
})
export class ManagerDashboardComponent {
  private readonly managerService = inject(ManagerService);
  private readonly calendarService = inject(CalendarService);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(true);
  readonly team = signal<TeamMember[]>([]);
  readonly pending = signal<LeaveRequest[]>([]);
  readonly history = signal<LeaveRequest[]>([]);
  readonly availability = signal<TeamAvailability | null>(null);
  readonly calendar = signal<CalendarMonth | null>(null);
  readonly action = signal<PendingAction | null>(null);

  private readonly year = new Date().getFullYear();
  private readonly month = new Date().getMonth() + 1;
  private readonly today = todayIso();

  readonly approvedCount = computed(() => this.history().filter((item) => item.status === 'APPROVED').length);
  readonly rejectedCount = computed(() => this.history().filter((item) => item.status === 'REJECTED').length);
  readonly todayLabel = () => formatDate(this.today, { weekday: 'long', month: 'long', day: 'numeric' });
  readonly monthLabel = () => `${monthName(this.month)} ${this.year}`;

  readonly availabilityDatasets = computed(() => [
    {
      data: [
        this.availability()?.available ?? 0,
        this.availability()?.onLeave ?? 0,
        this.availability()?.pending ?? 0,
      ],
      backgroundColor: ['#4f46e5', '#0f9f6e', '#f59e0b'],
      borderWidth: 0,
    },
  ]);

  readonly balanceSummary = computed<BalanceSummary[]>(() => {
    const rows = new Map<string, BalanceSummary>();
    for (const member of this.team()) {
      for (const balance of member.balances ?? []) {
        const current = rows.get(balance.name) ?? {
          name: balance.name,
          allowanceDays: 0,
          approvedDays: 0,
          pendingDays: 0,
          availableDays: 0,
        };
        current.allowanceDays += balance.allowanceDays;
        current.approvedDays += balance.approvedDays;
        current.pendingDays += balance.pendingDays;
        current.availableDays += balance.availableDays;
        rows.set(balance.name, current);
      }
    }
    return [...rows.values()];
  });

  readonly calendarPreview = computed(() => {
    const month = this.calendar();
    if (!month) {
      return [];
    }
    const holidays = month.holidays.map((holiday) => ({
      key: `h-${holiday.id}`,
      title: holiday.name,
      subtitle: `Holiday · ${holiday.date.slice(5)}`,
    }));
    const leaves = month.requests.slice(0, 5).map((request) => ({
      key: `r-${request.id}`,
      title: `${request.employee?.fullName || 'Member'} — ${request.leaveType?.name || 'Leave'}`,
      subtitle: `${formatDateRange(request.startDate, request.endDate)} · ${request.status.toLowerCase()}`,
    }));
    return [...holidays, ...leaves].slice(0, 7);
  });

  readonly actionMessage = computed(() => {
    const current = this.action();
    if (!current) {
      return '';
    }
    return `${current.request.employee?.fullName} requested ${current.request.leaveType?.name} from ${formatDateRange(current.request.startDate, current.request.endDate)}.`;
  });

  constructor() {
    forkJoin({
      team: this.managerService.getTeam().pipe(catchError(() => of([] as TeamMember[]))),
      pending: this.managerService.getPendingRequests().pipe(catchError(() => of([] as LeaveRequest[]))),
      history: this.managerService
        .getTeamHistory({ year: this.year })
        .pipe(catchError(() => of([] as LeaveRequest[]))),
      availability: this.managerService.getAvailability(this.today).pipe(catchError(() => of(null))),
      calendar: this.calendarService.getMonth(this.year, this.month).pipe(catchError(() => of(null))),
    }).subscribe(({ team, pending, history, availability, calendar }) => {
      this.team.set(team);
      this.pending.set(pending);
      this.history.set(history);
      this.availability.set(availability);
      this.calendar.set(calendar);
      this.loading.set(false);
    });
  }

  askAction(request: LeaveRequest, kind: 'approve' | 'reject'): void {
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
        this.pending.update((items) => items.filter((item) => item.id !== updated.id));
        this.history.update((items) => [updated, ...items]);
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
