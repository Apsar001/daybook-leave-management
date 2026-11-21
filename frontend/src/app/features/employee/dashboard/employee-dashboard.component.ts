import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CalendarService } from '../../../core/services/calendar.service';
import { UserService } from '../../../core/services/user.service';
import { CalendarMonth, LeaveBalance, LeaveRequest } from '../../../core/models/api.models';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { formatDateRange, monthName } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ChartComponent,
    IconComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatCardComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header
      title="Good to see you, {{ firstName() }}"
      subtitle="Here is a quick view of your leave balance and recent activity."
    >
      <a class="btn btn-primary" routerLink="/employee/apply-leave">
        <app-icon name="plus" [size]="16" /> Apply leave
      </a>
    </app-page-header>

    @if (loading()) {
      <div class="card"><app-loading-state message="Preparing your dashboard…" /></div>
    } @else {
      <div class="stat-grid">
        <app-stat-card
          label="Available days"
          [value]="availableTotal()"
          icon="balance"
          tone="primary"
          hint="Across all leave types"
        />
        <app-stat-card label="Pending requests" [value]="pendingCount()" icon="clock" tone="warning" hint="Awaiting decision" />
        <app-stat-card label="Approved days" [value]="approvedTotal()" icon="check" tone="success" hint="This year" />
        <app-stat-card label="Leave types" [value]="balances().length" icon="types" tone="info" hint="Available to you" />
      </div>

      <div class="grid grid-2" style="margin-bottom: 18px;">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Recent requests</div>
              <div class="card-subtitle">Your latest leave activity</div>
            </div>
            <a class="btn btn-ghost btn-sm" routerLink="/employee/my-requests">View all</a>
          </div>
          <div class="card-body">
            @if (recentRequests().length) {
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr><th>Leave</th><th>Dates</th><th>Days</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    @for (request of recentRequests(); track request.id) {
                      <tr>
                        <td class="cell-primary">{{ request.leaveType?.name }}</td>
                        <td class="cell-muted nowrap">{{ range(request.startDate, request.endDate) }}</td>
                        <td>{{ request.workingDays }}</td>
                        <td><app-status-badge [status]="request.status" /></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><strong>No leave requests yet</strong><span>Apply for your first leave to see it here.</span></div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Balance breakdown</div>
              <div class="card-subtitle">Available, approved and pending days</div>
            </div>
          </div>
          <div class="card-body">
            <app-chart
              type="doughnut"
              [labels]="['Available', 'Approved', 'Pending']"
              [datasets]="doughnutDatasets()"
              [height]="245"
              [showLegend]="true"
              ariaLabel="Leave balance breakdown"
            />
          </div>
        </section>
      </div>

      <div class="grid grid-2">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Balance by leave type</div>
              <div class="card-subtitle">Available days remaining</div>
            </div>
          </div>
          <div class="card-body">
            <app-chart
              type="bar"
              [labels]="chartLabels()"
              [datasets]="barDatasets()"
              [height]="250"
              ariaLabel="Available days by leave type"
            />
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">{{ monthLabel() }} preview</div>
              <div class="card-subtitle">Holidays and upcoming leave</div>
            </div>
            <a class="btn btn-ghost btn-sm" routerLink="/employee/calendar">Open calendar</a>
          </div>
          <div class="card-body">
            @if (calendarPreview().length) {
              <div style="display: flex; flex-direction: column; gap: 9px;">
                @for (item of calendarPreview(); track item.key) {
                  <div style="display: flex; justify-content: space-between; gap: 10px; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                    <div>
                      <div class="cell-primary" style="font-size: 12px;">{{ item.title }}</div>
                      <div class="cell-muted">{{ item.subtitle }}</div>
                    </div>
                    <span class="badge" [class.info]="item.kind === 'holiday'" [class.success]="item.kind === 'approved'" [class.warning]="item.kind === 'pending'">
                      {{ item.kind === 'holiday' ? 'Holiday' : item.kind === 'approved' ? 'Approved' : 'Pending' }}
                    </span>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state"><strong>Nothing on the calendar</strong><span>No holidays or leave recorded for this month.</span></div>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class EmployeeDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly calendarService = inject(CalendarService);

  readonly loading = signal(true);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly requests = signal<LeaveRequest[]>([]);
  readonly calendar = signal<CalendarMonth | null>(null);

  private readonly year = new Date().getFullYear();
  private readonly month = new Date().getMonth() + 1;

  readonly firstName = computed(() => this.auth.currentUser()?.fullName?.split(' ')[0] ?? 'there');
  readonly pendingCount = computed(() => this.requests().filter((item) => item.status === 'PENDING').length);
  readonly approvedDays = computed(() =>
    this.requests().filter((item) => item.status === 'APPROVED').reduce((sum, item) => sum + item.workingDays, 0),
  );
  readonly availableTotal = computed(() => this.balances().reduce((sum, item) => sum + item.availableDays, 0));
  readonly approvedTotal = computed(() => this.balances().reduce((sum, item) => sum + item.approvedDays, 0));
  readonly pendingTotal = computed(() => this.balances().reduce((sum, item) => sum + item.pendingDays, 0));
  readonly recentRequests = computed(() => [...this.requests()].slice(0, 5));
  readonly monthLabel = () => `${monthName(this.month)} ${this.year}`;

  readonly chartLabels = computed(() => this.balances().map((item) => item.name));
  readonly barDatasets = computed(() => [
    {
      data: this.balances().map((item) => item.availableDays),
      backgroundColor: this.balances().map((item) => item.color || '#4f46e5'),
      borderRadius: 6,
      maxBarThickness: 38,
    },
  ]);
  readonly doughnutDatasets = computed(() => [
    {
      data: [this.availableTotal(), this.approvedTotal(), this.pendingTotal()],
      backgroundColor: ['#4f46e5', '#0f9f6e', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ]);

  readonly calendarPreview = computed(() => {
    const monthData = this.calendar();
    if (!monthData) {
      return [];
    }
    const holidays = monthData.holidays.map((holiday) => ({
      key: `h-${holiday.id}`,
      kind: 'holiday',
      title: holiday.name,
      subtitle: `Holiday · ${holiday.date.slice(5)}`,
    }));
    const leaves = monthData.requests.slice(0, 5).map((request) => ({
      key: `r-${request.id}`,
      kind: request.status === 'PENDING' ? 'pending' : 'approved',
      title: request.employee?.fullName || 'Team member',
      subtitle: `${request.leaveType?.name || 'Leave'} · ${formatDateRange(request.startDate, request.endDate)}`,
    }));
    return [...holidays, ...leaves].slice(0, 7);
  });

  ngOnInit(): void {
    forkJoin({
      balances: this.userService.getBalance(this.year).pipe(catchError(() => of([] as LeaveBalance[]))),
      requests: this.userService.getMyRequests().pipe(catchError(() => of([] as LeaveRequest[]))),
      calendar: this.calendarService.getMonth(this.year, this.month).pipe(catchError(() => of(null))),
    }).subscribe(({ balances, requests, calendar }) => {
      this.balances.set(balances);
      this.requests.set(requests);
      this.calendar.set(calendar);
      this.loading.set(false);
    });
  }

  range(start: string, end: string): string {
    return formatDateRange(start, end);
  }
}
