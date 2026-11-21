import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeaveType } from '../../../core/models/api.models';
import { LeaveTypeService } from '../../../core/services/leave-type.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-leave-types',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Leave types" subtitle="Configure leave categories and yearly allowances." />

    <div class="grid grid-main-side">
      <section class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Configured leave types</div>
            <div class="card-subtitle">{{ leaveTypes().length }} type(s)</div>
          </div>
        </div>
        <div class="card-body">
          <app-data-table
            [loading]="loading()"
            [empty]="!leaveTypes().length"
            emptyTitle="No leave types"
            emptyMessage="Add your first leave type using the form."
            [error]="errorMessage()"
          >
            <table class="data-table">
              <thead><tr><th>Name</th><th>Description</th><th>Allowance</th><th>Status</th><th style="text-align: right;">Action</th></tr></thead>
              <tbody>
                @for (type of leaveTypes(); track type.id) {
                  <tr>
                    <td class="cell-primary">{{ type.name }}</td>
                    <td class="cell-muted">{{ type.description || '—' }}</td>
                    <td>{{ type.yearlyAllowance }} days/year</td>
                    <td><span class="badge" [class.success]="type.isActive" [class.neutral]="!type.isActive">{{ type.isActive ? 'Active' : 'Inactive' }}</span></td>
                    <td><div class="table-actions"><button type="button" class="btn btn-secondary btn-sm" (click)="edit(type)">Edit</button></div></td>
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
            <div class="card-title">{{ editingId() ? 'Edit leave type' : 'Add leave type' }}</div>
            <div class="card-subtitle">{{ editingId() ? 'Update the selected category' : 'Create a new leave category' }}</div>
          </div>
        </div>
        <div class="card-body">
          @if (formError()) {
            <div class="alert alert-error" role="alert">{{ formError() }}</div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-field">
              <label class="form-label" for="name">Name<span class="required">*</span></label>
              <input id="name" class="form-control" formControlName="name" placeholder="e.g. Annual Leave" />
              @if (invalid('name')) { <span class="form-error">Name is required.</span> }
            </div>

            <div class="form-field" style="margin-top: 14px;">
              <label class="form-label" for="description">Description</label>
              <textarea id="description" class="form-control" formControlName="description" rows="3" placeholder="Short description…"></textarea>
            </div>

            <div class="form-field" style="margin-top: 14px;">
              <label class="form-label" for="allowance">Yearly allowance<span class="required">*</span></label>
              <input id="allowance" type="number" min="0" class="form-control" formControlName="yearlyAllowance" />
              @if (invalid('yearlyAllowance')) { <span class="form-error">Enter a valid allowance.</span> }
            </div>

            <label class="checkbox-row" style="margin: 16px 0 20px;">
              <input type="checkbox" formControlName="isActive" />
              Active (available to employees)
            </label>

            <div style="display: flex; gap: 9px; flex-wrap: wrap;">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                {{ saving() ? 'Saving…' : editingId() ? 'Save changes' : 'Create leave type' }}
              </button>
              @if (editingId()) {
                <button type="button" class="btn btn-secondary" (click)="resetForm()">Cancel</button>
              }
            </div>
          </form>
        </div>
      </section>
    </div>
  `,
})
export class LeaveTypesComponent {
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly notifications = inject(NotificationService);

  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly formError = signal('');

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    description: new FormControl('', { nonNullable: true }),
    yearlyAllowance: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.leaveTypeService.adminList().subscribe({
      next: (types) => {
        this.leaveTypes.set(types);
        this.loading.set(false);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not load leave types.');
        this.loading.set(false);
      },
    });
  }

  edit(type: LeaveType): void {
    this.editingId.set(type.id);
    this.formError.set('');
    this.form.setValue({
      name: type.name,
      description: type.description ?? '',
      yearlyAllowance: type.yearlyAllowance,
      isActive: type.isActive,
    });
  }

  submit(): void {
    this.formError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const payload = this.form.getRawValue();
    const request$ = this.editingId()
      ? this.leaveTypeService.update(this.editingId() as string, payload)
      : this.leaveTypeService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.editingId() ? 'Leave type updated.' : 'Leave type created.');
        this.resetForm();
        this.load();
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.saving.set(false);
        this.formError.set(error.messages?.join(' ') || error.message || 'Could not save leave type.');
      },
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', description: '', yearlyAllowance: 0, isActive: true });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  invalid(name: 'name' | 'yearlyAllowance'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }
}
