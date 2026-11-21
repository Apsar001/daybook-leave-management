import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { CalendarHoliday, LeaveType } from '../../../core/models/api.models';
import { CalendarService } from '../../../core/services/calendar.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { LeaveTypeService } from '../../../core/services/leave-type.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { formatDate, monthsBetween, parseDate, todayIso, workingDaysBetween } from '../../../shared/utils/date.utils';

const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get('startDate')?.value as string;
  const end = control.get('endDate')?.value as string;
  if (!start || !end) {
    return null;
  }
  return parseDate(end).getTime() < parseDate(start).getTime() ? { endBeforeStart: true } : null;
};

@Component({
  selector: 'app-apply-leave',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  template: `
    <app-page-header title="Apply for leave" subtitle="Tell us when you are away and we will handle the rest." />

    <div class="grid grid-main-side">
      <section class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Leave request</div>
            <div class="card-subtitle">All fields are required unless marked optional</div>
          </div>
        </div>
        <div class="card-body">
          @if (errorMessage()) {
            <div class="alert alert-error" role="alert" aria-live="assertive">{{ errorMessage() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-grid">
              <div class="form-field full">
                <label class="form-label" for="leaveTypeId">Leave type<span class="required">*</span></label>
                <select id="leaveTypeId" class="form-control" formControlName="leaveTypeId" [attr.aria-invalid]="isInvalid('leaveTypeId')">
                  <option value="">Select a leave type</option>
                  @for (type of leaveTypes(); track type.id) {
                    <option [value]="type.id">{{ type.name }} — {{ type.yearlyAllowance }} days/year</option>
                  }
                </select>
                @if (isInvalid('leaveTypeId')) {
                  <span class="form-error" role="alert">Please choose a leave type.</span>
                }
              </div>

              <div class="form-field">
                <label class="form-label" for="startDate">Start date<span class="required">*</span></label>
                <input
                  id="startDate"
                  type="date"
                  class="form-control"
                  formControlName="startDate"
                  [min]="minDate"
                  [attr.aria-invalid]="isInvalid('startDate')"
                />
                @if (isInvalid('startDate')) {
                  <span class="form-error" role="alert">Start date is required.</span>
                }
              </div>

              <div class="form-field">
                <label class="form-label" for="endDate">End date<span class="required">*</span></label>
                <input
                  id="endDate"
                  type="date"
                  class="form-control"
                  formControlName="endDate"
                  [min]="form.controls.startDate.value || minDate"
                  [attr.aria-invalid]="isInvalid('endDate') || form.hasError('endBeforeStart')"
                />
                @if (isInvalid('endDate')) {
                  <span class="form-error" role="alert">End date is required.</span>
                } @else if (form.hasError('endBeforeStart')) {
                  <span class="form-error" role="alert">End date cannot be before the start date.</span>
                }
              </div>

              <div class="form-field full">
                <label class="form-label" for="reason">Reason<span class="required">*</span></label>
                <textarea
                  id="reason"
                  class="form-control"
                  formControlName="reason"
                  placeholder="Share a short reason for your leave…"
                  [attr.aria-invalid]="isInvalid('reason')"
                ></textarea>
                @if (isInvalid('reason')) {
                  <span class="form-error" role="alert">Please add a reason (at least 5 characters).</span>
                }
              </div>
            </div>

            <div style="display: flex; gap: 9px; margin-top: 22px; flex-wrap: wrap;">
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="spinner" style="width: 15px; height: 15px; border-width: 2px;"></span> Submitting…
                } @else {
                  Submit request
                }
              </button>
              <a class="btn btn-secondary" routerLink="/employee/my-requests">Cancel</a>
            </div>
          </form>
        </div>
      </section>

      <aside style="display: flex; flex-direction: column; gap: 18px;">
        <section class="card">
          <div class="card-header"><div class="card-title">Request preview</div></div>
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-item full">
                <div class="detail-label">Working days</div>
                <div class="detail-value" style="font-size: 22px;">{{ workingDays() }}</div>
              </div>
              <div class="detail-item full">
                <div class="detail-label">Selected range</div>
                <div class="detail-value">{{ previewRange() }}</div>
              </div>
            </div>
            <p class="form-hint" style="margin-top: 12px;">
              Weekends and {{ holidayDates().length }} recorded holiday(s) in this range are excluded automatically.
            </p>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div class="card-title">Good to know</div></div>
          <div class="card-body" style="color: var(--text-muted); font-size: 12px; display: flex; flex-direction: column; gap: 10px;">
            <p>• Requests are reviewed by your manager.</p>
            <p>• Approved and pending days appear in your balance.</p>
            <p>• You can cancel eligible requests from My Requests.</p>
          </div>
        </section>
      </aside>
    </div>
  `,
})
export class ApplyLeaveComponent implements OnInit {
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly calendarService = inject(CalendarService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly form = new FormGroup(
    {
      leaveTypeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      reason: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
    },
    { validators: [dateRangeValidator] },
  );

  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly holidayDates = signal<string[]>([]);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly minDate = todayIso();

  private readonly formValue = signal(this.form.getRawValue());
  private holidayKey = '';
  private readonly subscriptions: Subscription[] = [];

  readonly workingDays = computed(() => {
    const { startDate, endDate } = this.formValue();
    return startDate && endDate ? workingDaysBetween(startDate, endDate, this.holidayDates()) : 0;
  });

  readonly previewRange = computed(() => {
    const { startDate, endDate } = this.formValue();
    if (!startDate || !endDate) {
      return 'Select a date range';
    }
    return `${formatDate(startDate, { month: 'short', day: 'numeric' })} – ${formatDate(endDate)}`;
  });

  ngOnInit(): void {
    this.leaveTypeService.getActive().subscribe({
      next: (types) => {
        this.leaveTypes.set(types);
        if (types.length) {
          this.form.controls.leaveTypeId.setValue(types[0].id);
        }
      },
      error: () => this.errorMessage.set('Leave types could not be loaded. Please refresh the page.'),
    });

    this.subscriptions.push(
      this.form.valueChanges.subscribe(() => {
        this.formValue.set(this.form.getRawValue());
        this.loadHolidaysForRange();
      }),
    );
    this.loadHolidaysForRange();
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.workingDays() < 1) {
      this.errorMessage.set('The selected range has no working days. Please choose different dates.');
      return;
    }

    this.submitting.set(true);
    this.leaveRequestService.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success('Leave request submitted successfully.');
        this.form.reset({ leaveTypeId: this.leaveTypes()[0]?.id ?? '', startDate: '', endDate: '', reason: '' });
        void this.router.navigate(['/employee/my-requests']);
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.submitting.set(false);
        this.errorMessage.set(error.messages?.join(' ') || error.message || 'Could not submit the request.');
      },
    });
  }

  isInvalid(name: 'leaveTypeId' | 'startDate' | 'endDate' | 'reason'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  private loadHolidaysForRange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    const anchor = startDate || todayIso();
    const months = monthsBetween(anchor, endDate || anchor);
    const key = months.map((item) => `${item.year}-${item.month}`).join('|');
    if (!key || key === this.holidayKey) {
      return;
    }
    this.holidayKey = key;

    this.subscriptions
      .filter((subscription) => subscription !== this.subscriptions[0])
      .forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.splice(1);
    this.subscriptions.push(
      forkJoin(
        months.map((item) =>
          this.calendarService.getMonth(item.year, item.month).pipe(catchError(() => of(null))),
        ),
      ).subscribe((responses) => {
        const holidays = responses
          .filter((response): response is NonNullable<typeof response> => response !== null)
          .flatMap((response) => response.holidays ?? [])
          .map((holiday: CalendarHoliday) => holiday.date);
        this.holidayDates.set([...new Set(holidays)]);
      }),
    );
  }
}
