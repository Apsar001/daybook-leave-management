import { Component, inject, signal } from '@angular/core';
import { TeamAvailability, TeamMember } from '../../../core/models/api.models';
import { ManagerService } from '../../../core/services/manager.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { formatDate, todayIso } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [DataTableComponent, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="Team" subtitle="See your members, their leave balances and who is available." />

    <div class="stat-grid">
      <app-stat-card label="Team members" [value]="members().length" icon="team" tone="primary" />
      <app-stat-card label="Available on {{ selectedDateLabel() }}" [value]="availability()?.available || 0" icon="check" tone="success" />
      <app-stat-card label="On leave" [value]="availability()?.onLeave || 0" icon="balance" tone="info" />
      <app-stat-card label="Pending leave" [value]="availability()?.pending || 0" icon="clock" tone="warning" />
    </div>

    <div class="grid grid-main-side">
      <section class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Members and balances</div>
            <div class="card-subtitle">Current leave entitlement by member</div>
          </div>
        </div>
        <div class="card-body">
          <app-data-table
            [loading]="loadingMembers()"
            [empty]="!members().length"
            emptyTitle="No team members"
            emptyMessage="Team members will appear here once assigned."
          >
            <table class="data-table">
              <thead>
                <tr><th>Member</th><th>Role</th><th>Balances</th><th style="text-align: right;">Total available</th></tr>
              </thead>
              <tbody>
                @for (member of members(); track member.id) {
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="avatar">{{ initials(member.fullName) }}</span>
                        <span>
                          <span class="cell-primary" style="display: block;">{{ member.fullName }}</span>
                          <span class="cell-muted">{{ member.email }}</span>
                        </span>
                      </div>
                    </td>
                    <td><span class="badge neutral" style="text-transform: capitalize;">{{ member.role?.toLowerCase() }}</span></td>
                    <td>
                      <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        @for (balance of member.balances; track balance.name) {
                          <span class="chip">{{ balance.name }}: <strong style="color: var(--navy);">{{ balance.availableDays }}</strong></span>
                        }
                      </div>
                    </td>
                    <td style="text-align: right;"><span class="badge success">{{ totalAvailable(member) }} days</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </app-data-table>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Availability</div>
            <div class="card-subtitle">Check who is free on a given date</div>
          </div>
        </div>
        <div class="card-body">
          <div class="form-field">
            <label class="form-label" for="availability-date">Date</label>
            <input id="availability-date" type="date" class="form-control" [value]="selectedDate()" (change)="changeDate($event)" />
          </div>

          @if (loadingAvailability()) {
            <div class="loading-state"><span class="spinner"></span><span>Loading availability…</span></div>
          } @else if (availability(); as data) {
            <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
              @for (member of data.members; track member.id) {
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
                  <span class="cell-primary" style="font-size: 12px;">{{ member.fullName }}</span>
                  <span class="badge" [class.success]="member.status === 'AVAILABLE'" [class.danger]="member.status === 'ON_LEAVE'" [class.warning]="member.status === 'PENDING'">
                    {{ statusLabel(member.status) }}
                  </span>
                </div>
                @if (member.leaveType) {
                  <div class="cell-muted" style="font-size: 10px; margin-top: -6px;">{{ member.leaveType }}</div>
                }
              }
            </div>
          } @else {
            <div class="empty-state" style="min-height: 120px;"><strong>No availability data</strong><span>Try another date.</span></div>
          }
        </div>
      </section>
    </div>
  `,
})
export class TeamComponent {
  private readonly managerService = inject(ManagerService);
  private readonly notifications = inject(NotificationService);

  readonly members = signal<TeamMember[]>([]);
  readonly availability = signal<TeamAvailability | null>(null);
  readonly selectedDate = signal(todayIso());
  readonly loadingMembers = signal(true);
  readonly loadingAvailability = signal(true);

  readonly selectedDateLabel = () => formatDate(this.selectedDate(), { month: 'short', day: 'numeric' });

  constructor() {
    this.managerService.getTeam().subscribe({
      next: (members) => {
        this.members.set(members);
        this.loadingMembers.set(false);
      },
      error: () => {
        this.members.set([]);
        this.loadingMembers.set(false);
        this.notifications.error('Could not load team members.');
      },
    });
    this.loadAvailability();
  }

  changeDate(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value) {
      return;
    }
    this.selectedDate.set(value);
    this.loadAvailability();
  }

  totalAvailable(member: TeamMember): number {
    return (member.balances ?? []).reduce((sum, balance) => sum + balance.availableDays, 0);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'ON_LEAVE':
        return 'On leave';
      case 'PENDING':
        return 'Pending';
      default:
        return status;
    }
  }

  private loadAvailability(): void {
    this.loadingAvailability.set(true);
    this.managerService.getAvailability(this.selectedDate()).subscribe({
      next: (data) => {
        this.availability.set(data);
        this.loadingAvailability.set(false);
      },
      error: () => {
        this.availability.set(null);
        this.loadingAvailability.set(false);
        this.notifications.error('Could not load availability for that date.');
      },
    });
  }
}
