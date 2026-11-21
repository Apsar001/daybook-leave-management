import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Holiday } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { formatDate } from '../../../shared/utils/date.utils';

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, DataTableComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Holidays" subtitle="Manage public holidays that are excluded from leave calculations." />

    <div class="grid grid-main-side">
      <section class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Holiday calendar</div>
            <div class="card-subtitle">{{ holidays().length }} holiday(s)</div>
          </div>
        </div>
        <div class="card-body">
          <app-data-table
            [loading]="loading()"
            [empty]="!holidays().length"
            emptyTitle="No holidays configured"
            emptyMessage="Add holidays to keep working day counts accurate."
            [error]="errorMessage()"
          >
            <table class="data-table">
              <thead><tr><th>Name</th><th>Date</th><th style="text-align: right;">Action</th></tr></thead>
              <tbody>
                @for (holiday of holidays(); track holiday.id) {
                  <tr>
                    <td class="cell-primary">{{ holiday.name }}</td>
                    <td class="cell-muted nowrap">{{ format(holiday.date) }}</td>
                    <td><div class="table-actions"><button type="button" class="btn btn-danger btn-sm" (click)="askDelete(holiday)">Delete</button></div></td>
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
            <div class="card-title">Add holiday</div>
            <div class="card-subtitle">All employees will see this date</div>
          </div>
        </div>
        <div class="card-body">
          @if (formError()) { <div class="alert alert-error" role="alert">{{ formError() }}</div> }
          <form [formGroup]="form" (ngSubmit)="create()" novalidate>
            <div class="form-field">
              <label class="form-label" for="holiday-name">Name<span class="required">*</span></label>
              <input id="holiday-name" class="form-control" formControlName="name" placeholder="e.g. Independence Day" />
              @if (invalid('name')) { <span class="form-error">Holiday name is required.</span> }
            </div>
            <div class="form-field" style="margin-top: 14px;">
              <label class="form-label" for="holiday-date">Date<span class="required">*</span></label>
              <input id="holiday-date" type="date" class="form-control" formControlName="date" />
              @if (invalid('date')) { <span class="form-error">Please select a date.</span> }
            </div>
            <div style="margin-top: 20px;">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Adding…' : 'Add holiday' }}</button>
            </div>
          </form>
        </div>
      </section>
    </div>

    <app-confirm-dialog
      [open]="!!deleteTarget()"
      title="Delete holiday?"
      [message]="'This will remove ' + (deleteTarget()?.name || 'the selected holiday') + ' from the calendar.'"
      confirmLabel="Delete holiday"
      [danger]="true"
      (confirmed)="confirmDelete()"
      (cancelled)="deleteTarget.set(null)"
    />
  `,
})
export class HolidaysComponent {
  private readonly adminService = inject(AdminService);
  private readonly notifications = inject(NotificationService);

  readonly holidays = signal<Holiday[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly formError = signal('');
  readonly deleteTarget = signal<Holiday | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getHolidays().subscribe({
      next: (holidays) => {
        this.holidays.set([...holidays].sort((a, b) => a.date.localeCompare(b.date)));
        this.loading.set(false);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not load holidays.');
        this.loading.set(false);
      },
    });
  }

  create(): void {
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.adminService.createHoliday(this.form.getRawValue()).subscribe({
      next: (holiday) => {
        this.holidays.update((items) => [...items, holiday].sort((a, b) => a.date.localeCompare(b.date)));
        this.form.reset({ name: '', date: '' });
        this.saving.set(false);
        this.notifications.success('Holiday added.');
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.saving.set(false);
        this.formError.set(error.messages?.join(' ') || error.message || 'Could not add holiday.');
      },
    });
  }

  askDelete(holiday: Holiday): void {
    this.deleteTarget.set(holiday);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) {
      return;
    }
    this.adminService.deleteHoliday(target.id).subscribe({
      next: () => {
        this.holidays.update((items) => items.filter((item) => item.id !== target.id));
        this.deleteTarget.set(null);
        this.notifications.success('Holiday deleted.');
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.deleteTarget.set(null);
        this.notifications.error(error.messages?.join(' ') || error.message || 'Could not delete holiday.');
      },
    });
  }

  invalid(name: 'name' | 'date'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  format(value: string): string {
    return formatDate(value, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }
}
