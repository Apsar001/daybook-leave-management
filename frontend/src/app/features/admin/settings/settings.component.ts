import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminSettings } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingStateComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Leave settings" subtitle="Set the organisation-wide rules for leave requests." />

    @if (loading()) {
      <div class="card"><app-loading-state message="Loading settings…" /></div>
    } @else {
      <div class="grid grid-main-side">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Request rules</div>
              <div class="card-subtitle">These values apply to every team</div>
            </div>
          </div>
          <div class="card-body">
            @if (errorMessage()) {
              <div class="alert alert-error" role="alert">{{ errorMessage() }}</div>
            }
            @if (successMessage()) {
              <div class="alert alert-success" role="status">{{ successMessage() }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="save()" novalidate>
              <div class="form-grid">
                <div class="form-field">
                  <label class="form-label" for="minNoticeDays">Minimum notice days<span class="required">*</span></label>
                  <input id="minNoticeDays" type="number" min="0" class="form-control" formControlName="minNoticeDays" />
                  <span class="form-hint">How far in advance employees should request leave.</span>
                  @if (invalid('minNoticeDays')) { <span class="form-error">Enter a value of 0 or more.</span> }
                </div>

                <div class="form-field">
                  <label class="form-label" for="maxTeamMembersOff">Max team members off<span class="required">*</span></label>
                  <input id="maxTeamMembersOff" type="number" min="1" class="form-control" formControlName="maxTeamMembersOff" />
                  <span class="form-hint">Maximum approved leave per team on the same day.</span>
                  @if (invalid('maxTeamMembersOff')) { <span class="form-error">Enter a value of 1 or more.</span> }
                </div>
              </div>

              <div style="margin-top: 22px;">
                <button type="submit" class="btn btn-primary" [disabled]="saving() || form.pristine">
                  @if (saving()) { <span class="spinner" style="width: 15px; height: 15px; border-width: 2px;"></span> Saving… }
                  @else { Save settings }
                </button>
              </div>
            </form>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div class="card-title">Advanced configuration</div></div>
          <div class="card-body">
            @if (settings()?.settings?.length) {
              <div style="display: flex; flex-direction: column; gap: 10px;">
                @for (item of settings()?.settings || []; track item.key) {
                  <div class="detail-item">
                    <div class="detail-label">{{ item.key }}</div>
                    <div class="detail-value">{{ item.value }}</div>
                    @if (item.description) { <div class="cell-muted" style="font-size: 11px; margin-top: 3px;">{{ item.description }}</div> }
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state"><strong>No advanced settings</strong><span>Additional keys will be listed here when present.</span></div>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class SettingsComponent {
  private readonly adminService = inject(AdminService);
  private readonly notifications = inject(NotificationService);

  readonly form = new FormGroup({
    minNoticeDays: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    maxTeamMembersOff: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
  });

  readonly settings = signal<AdminSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  constructor() {
    this.adminService.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.form.reset({
          minNoticeDays: settings.minNoticeDays,
          maxTeamMembersOff: settings.maxTeamMembersOff,
        });
        this.loading.set(false);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not load settings.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.adminService.updateSettings(this.form.getRawValue()).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.form.reset({ minNoticeDays: settings.minNoticeDays, maxTeamMembersOff: settings.maxTeamMembersOff });
        this.saving.set(false);
        this.successMessage.set('Settings saved successfully.');
        this.notifications.success('Leave settings updated.');
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.saving.set(false);
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not save settings.');
      },
    });
  }

  invalid(name: 'minNoticeDays' | 'maxTeamMembersOff'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }
}
