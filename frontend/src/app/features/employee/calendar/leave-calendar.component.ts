import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { CalendarService } from '../../../core/services/calendar.service';
import { CalendarAvailability, CalendarHoliday, CalendarMonth, CalendarRequest } from '../../../core/models/api.models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  addMonths,
  buildCalendarGrid,
  eachDayInclusive,
  monthName,
  parseDate,
  todayIso,
  toIsoDate,
} from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [IconComponent, LoadingStateComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Team calendar" subtitle="A shared view of leave, holidays and team availability.">
      <button type="button" class="btn btn-secondary" (click)="goToday()">Today</button>
    </app-page-header>

    <section class="card">
      <div class="card-header">
        <div class="calendar-toolbar" style="margin: 0; flex: 1;">
          <button type="button" class="icon-button" (click)="changeMonth(-1)" aria-label="Previous month">
            <app-icon name="chevron-left" [size]="16" />
          </button>
          <span class="calendar-month">{{ title() }}</span>
          <button type="button" class="icon-button" (click)="changeMonth(1)" aria-label="Next month">
            <app-icon name="chevron-right" [size]="16" />
          </button>
        </div>
        @if (teamName()) {
          <span class="badge neutral">{{ teamName() }}</span>
        }
      </div>

      <div class="card-body">
        @if (loading()) {
          <app-loading-state message="Loading calendar…" />
        } @else {
          @if (errorMessage()) {
            <div class="alert alert-error" role="alert">{{ errorMessage() }}</div>
          }

          <div class="calendar-grid" role="grid" [attr.aria-label]="title()">
            @for (weekday of weekdays; track weekday) {
              <div class="calendar-weekday" role="columnheader">{{ weekday }}</div>
            }
            @for (cell of cells(); track cell.iso) {
              <div
                class="calendar-day"
                role="gridcell"
                [class.muted]="!cell.inMonth"
                [class.today]="cell.isToday"
              >
                <div class="calendar-date-row">
                  <span class="calendar-date" [class.muted]="!cell.inMonth">{{ cell.day }}</span>
                  @if (cell.isToday) {
                    <span class="calendar-today-dot" title="Today"></span>
                  }
                </div>

                @if (holidayFor(cell.iso); as holiday) {
                  <span class="calendar-chip holiday" [title]="holiday.name">{{ holiday.name }}</span>
                }

                @for (request of requestsFor(cell.iso).slice(0, 2); track request.id) {
                  <span
                    class="calendar-chip"
                    [class.approved]="request.status === 'APPROVED'"
                    [class.pending]="request.status !== 'APPROVED'"
                    [title]="request.employee.fullName + ' — ' + request.leaveType.name"
                  >
                    {{ request.employee.fullName }} · {{ request.leaveType.name }}
                  </span>
                }
                @if (requestsFor(cell.iso).length > 2) {
                  <span class="cell-muted" style="font-size: 9px;">+{{ requestsFor(cell.iso).length - 2 }} more</span>
                }

                @if (availabilityFor(cell.iso); as availability) {
                  <div class="calendar-availability">
                    {{ availability.available }}/{{ availability.total }} available · {{ availability.onLeave }} away
                  </div>
                }
              </div>
            }
          </div>

          <div class="calendar-legend">
            <span><i class="legend-swatch" style="background: var(--success);"></i> Approved leave</span>
            <span><i class="legend-swatch" style="background: var(--warning);"></i> Pending leave</span>
            <span><i class="legend-swatch" style="background: var(--info);"></i> Holiday</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class LeaveCalendarComponent {
  private readonly calendarService = inject(CalendarService);
  private readonly auth = inject(AuthService);

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly monthData = signal<CalendarMonth | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  readonly title = computed(() => `${monthName(this.month())} ${this.year()}`);
  readonly cells = computed(() => buildCalendarGrid(this.year(), this.month()));
  readonly teamName = computed(() => this.auth.currentUser()?.teamName ?? null);

  constructor() {
    this.load();
  }

  changeMonth(delta: number): void {
    const next = addMonths(this.year(), this.month(), delta);
    this.year.set(next.year);
    this.month.set(next.month);
    this.load();
  }

  goToday(): void {
    this.year.set(new Date().getFullYear());
    this.month.set(new Date().getMonth() + 1);
    this.load();
  }

  requestsFor(iso: string): CalendarRequest[] {
    return (this.monthData()?.requests ?? []).filter((request) => {
      const days = eachDayInclusive(request.startDate, request.endDate).map((day) => toIsoDate(day));
      return days.includes(iso);
    });
  }

  holidayFor(iso: string): CalendarHoliday | undefined {
    return (this.monthData()?.holidays ?? []).find((holiday) => holiday.date === iso);
  }

  availabilityFor(iso: string): CalendarAvailability | undefined {
    return (this.monthData()?.availability ?? []).find((item) => item.date === iso);
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.calendarService
      .getMonth(this.year(), this.month(), this.auth.currentUser()?.teamId)
      .subscribe({
        next: (data) => {
          this.monthData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.monthData.set(null);
          this.errorMessage.set('The calendar could not be loaded. Please try again.');
          this.loading.set(false);
        },
      });
  }
}
