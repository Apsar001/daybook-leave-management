import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AdminSettings, AdminStatistics, AdminTeam, LeaveType } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { LeaveTypeService } from '../../../core/services/leave-type.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, IconComponent, LoadingStateComponent, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="Admin dashboard" subtitle="Organisation-wide leave operations and configuration.">
      <a class="btn btn-secondary" routerLink="/admin/settings"><app-icon name="settings" [size]="16" /> Settings</a>
      <a class="btn btn-primary" routerLink="/admin/leave-types"><app-icon name="plus" [size]="16" /> Manage leave types</a>
    </app-page-header>

    @if (loading()) {
      <div class="card"><app-loading-state message="Loading organisation overview…" /></div>
    } @else {
      <div class="stat-grid">
        <app-stat-card label="Employees" [value]="statistics()?.totalEmployees || 0" icon="team" tone="primary" hint="Across all teams" />
        <app-stat-card label="Pending requests" [value]="statistics()?.pendingRequests || 0" icon="clock" tone="warning" hint="Awaiting manager action" />
        <app-stat-card label="Approved requests" [value]="statistics()?.approvedRequests || 0" icon="check" tone="success" hint="Current records" />
        <app-stat-card label="Teams" [value]="statistics()?.totalTeams || 0" icon="dashboard" tone="info" hint="Active teams" />
      </div>

      <div class="grid grid-main-side" style="margin-bottom: 18px;">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Configuration summary</div>
              <div class="card-subtitle">Current leave policy settings</div>
            </div>
            <a class="btn btn-ghost btn-sm" routerLink="/admin/settings">Edit</a>
          </div>
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">Minimum notice</div>
                <div class="detail-value">{{ settings()?.minNoticeDays ?? '—' }} day(s)</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Max team members off</div>
                <div class="detail-value">{{ settings()?.maxTeamMembersOff ?? '—' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Managers</div>
                <div class="detail-value">{{ statistics()?.totalManagers || 0 }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Administrators</div>
                <div class="detail-value">{{ statistics()?.totalAdmins || 0 }}</div>
              </div>
            </div>

            <div class="overview-links" style="margin-top: 16px;">
              <a class="overview-link" routerLink="/admin/leave-types">
                <app-icon name="types" [size]="20" />
                <span><strong>Leave types</strong><small>Allowances and availability</small></span>
              </a>
              <a class="overview-link" routerLink="/admin/holidays">
                <app-icon name="holidays" [size]="20" />
                <span><strong>Holidays</strong><small>Public holiday calendar</small></span>
              </a>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div class="card-title">Request status</div></div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 13px;">
              @for (item of statusBreakdown(); track item.label) {
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                    <span>{{ item.label }}</span><strong style="color: var(--navy);">{{ item.value }}</strong>
                  </div>
                  <div class="progress-track"><div class="progress-fill" [style.width.%]="item.percent" [style.background]="item.color"></div></div>
                </div>
              }
            </div>
            <p class="form-hint" style="margin-top: 16px;">{{ statistics()?.cancelledRequests || 0 }} cancelled request(s) are also recorded.</p>
          </div>
        </section>
      </div>

      <div class="grid grid-2">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Leave type overview</div>
              <div class="card-subtitle">Configured entitlements</div>
            </div>
            <a class="btn btn-ghost btn-sm" routerLink="/admin/leave-types">Manage</a>
          </div>
          <div class="card-body">
            @if (leaveTypes().length) {
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Leave type</th><th>Allowance</th><th>Status</th></tr></thead>
                  <tbody>
                    @for (type of leaveTypes(); track type.id) {
                      <tr>
                        <td class="cell-primary">{{ type.name }}</td>
                        <td>{{ type.yearlyAllowance }} days</td>
                        <td><span class="badge" [class.success]="type.isActive" [class.neutral]="!type.isActive">{{ type.isActive ? 'Active' : 'Inactive' }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><strong>No leave types</strong><span>Create a leave type to get started.</span></div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Team coverage</div>
              <div class="card-subtitle">Managers and member counts</div>
            </div>
          </div>
          <div class="card-body">
            @if (teams().length) {
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Team</th><th>Manager</th><th>Members</th></tr></thead>
                  <tbody>
                    @for (team of teams(); track team.id) {
                      <tr>
                        <td class="cell-primary">{{ team.name }}</td>
                        <td class="cell-muted">{{ team.manager?.fullName || 'Unassigned' }}</td>
                        <td><span class="chip">{{ team.memberCount }} members</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><strong>No teams yet</strong><span>Teams will appear once configured in the backend.</span></div>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class AdminDashboardComponent {
  private readonly adminService = inject(AdminService);
  private readonly leaveTypeService = inject(LeaveTypeService);

  readonly loading = signal(true);
  readonly statistics = signal<AdminStatistics | null>(null);
  readonly settings = signal<AdminSettings | null>(null);
  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly teams = signal<AdminTeam[]>([]);

  readonly statusBreakdown = () => {
    const stats = this.statistics();
    const values = [
      { label: 'Approved', value: stats?.approvedRequests ?? 0, color: '#0f9f6e' },
      { label: 'Pending', value: stats?.pendingRequests ?? 0, color: '#f59e0b' },
      { label: 'Rejected', value: stats?.rejectedRequests ?? 0, color: '#dc2626' },
    ];
    const max = Math.max(1, ...values.map((item) => item.value));
    return values.map((item) => ({ ...item, percent: Math.round((item.value / max) * 100) }));
  };

  constructor() {
    forkJoin({
      statistics: this.adminService.getStatistics().pipe(catchError(() => of(null))),
      settings: this.adminService.getSettings().pipe(catchError(() => of(null))),
      leaveTypes: this.leaveTypeService.adminList().pipe(catchError(() => of([] as LeaveType[]))),
      teams: this.adminService.getTeams().pipe(catchError(() => of([] as AdminTeam[]))),
    }).subscribe(({ statistics, settings, leaveTypes, teams }) => {
      this.statistics.set(statistics);
      this.settings.set(settings);
      this.leaveTypes.set(leaveTypes);
      this.teams.set(teams);
      this.loading.set(false);
    });
  }
}
