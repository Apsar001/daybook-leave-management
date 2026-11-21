import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { LeaveBalance } from '../../../core/models/api.models';
import { UserService } from '../../../core/services/user.service';
import { ChartComponent } from '../../../shared/components/chart/chart.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-my-balance',
  standalone: true,
  imports: [ChartComponent, DataTableComponent, PageHeaderComponent, StatCardComponent],
  template: `
    <app-page-header title="My balance" subtitle="See how much leave you have available for the selected year.">
      <select class="form-control" [value]="year()" (change)="changeYear($event)" aria-label="Select year" style="width: auto;">
        @for (option of yearOptions; track option) {
          <option [value]="option">{{ option }}</option>
        }
      </select>
    </app-page-header>

    @if (loading()) {
      <div class="card"><app-data-table [loading]="true" /></div>
    } @else {
      <div class="stat-grid">
        <app-stat-card label="Allowance" [value]="allowanceTotal()" icon="balance" tone="primary" />
        <app-stat-card label="Available" [value]="availableTotal()" icon="check" tone="success" />
        <app-stat-card label="Approved" [value]="approvedTotal()" icon="requests" tone="info" />
        <app-stat-card label="Pending" [value]="pendingTotal()" icon="clock" tone="warning" />
      </div>

      <div class="grid grid-main-side">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Balance by leave type</div>
              <div class="card-subtitle">{{ year() }} entitlement overview</div>
            </div>
          </div>
          <div class="card-body">
            <app-data-table
              [empty]="!balances().length"
              emptyTitle="No balance data"
              emptyMessage="Leave balances will appear once configured."
            >
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Leave type</th>
                    <th>Allowance</th>
                    <th>Approved</th>
                    <th>Pending</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  @for (balance of balances(); track balance.leaveTypeId) {
                    <tr>
                      <td>
                        <div class="cell-primary" style="display: flex; align-items: center; gap: 8px;">
                          <span class="color-dot" [style.background]="balance.color || '#4f46e5'"></span>
                          {{ balance.name }}
                        </div>
                        <div class="cell-muted">{{ balance.description || '—' }}</div>
                      </td>
                      <td>{{ balance.allowanceDays }}</td>
                      <td>{{ balance.approvedDays }}</td>
                      <td>{{ balance.pendingDays }}</td>
                      <td><span class="badge success">{{ balance.availableDays }} days</span></td>
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
              <div class="card-title">Available days</div>
              <div class="card-subtitle">Remaining balance by type</div>
            </div>
          </div>
          <div class="card-body">
            <app-chart
              type="bar"
              [labels]="labels()"
              [datasets]="datasets()"
              [height]="300"
              ariaLabel="Available leave days by type"
            />
          </div>
        </section>
      </div>
    }
  `,
})
export class MyBalanceComponent implements OnInit {
  private readonly userService = inject(UserService);

  readonly year = signal(new Date().getFullYear());
  readonly yearOptions = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly loading = signal(true);

  readonly allowanceTotal = computed(() => this.balances().reduce((sum, item) => sum + item.allowanceDays, 0));
  readonly availableTotal = computed(() => this.balances().reduce((sum, item) => sum + item.availableDays, 0));
  readonly approvedTotal = computed(() => this.balances().reduce((sum, item) => sum + item.approvedDays, 0));
  readonly pendingTotal = computed(() => this.balances().reduce((sum, item) => sum + item.pendingDays, 0));
  readonly labels = computed(() => this.balances().map((item) => item.name));
  readonly datasets = computed(() => [
    {
      label: 'Available days',
      data: this.balances().map((item) => item.availableDays),
      backgroundColor: this.balances().map((item) => item.color || '#4f46e5'),
      borderRadius: 6,
      maxBarThickness: 36,
    },
  ]);

  ngOnInit(): void {
    this.load();
  }

  changeYear(event: Event): void {
    this.year.set(Number((event.target as HTMLSelectElement).value));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.userService.getBalance(this.year()).subscribe({
      next: (balances) => {
        this.balances.set(balances);
        this.loading.set(false);
      },
      error: () => {
        this.balances.set([]);
        this.loading.set(false);
      },
    });
  }
}
