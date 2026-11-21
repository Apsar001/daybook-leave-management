import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CalendarService } from '../../../core/services/calendar.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { LeaveTypeService } from '../../../core/services/leave-type.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApplyLeaveComponent } from './apply-leave.component';

describe('ApplyLeaveComponent working-day preview', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyLeaveComponent],
      providers: [
        provideRouter([]),
        {
          provide: LeaveTypeService,
          useValue: {
            getActive: () =>
              of([
                {
                  id: 'annual',
                  name: 'Annual Leave',
                  yearlyAllowance: 20,
                  isActive: true,
                },
              ]),
          },
        },
        {
          provide: CalendarService,
          useValue: { getMonth: () => of({ holidays: [] }) },
        },
        {
          provide: LeaveRequestService,
          useValue: { create: () => of({}) },
        },
        {
          provide: NotificationService,
          useValue: { success: () => undefined, error: () => undefined },
        },
      ],
    }).compileComponents();
  });

  it('updates the working-day preview when the date range changes', () => {
    const fixture = TestBed.createComponent(ApplyLeaveComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.workingDays()).toBe(0);
    expect(component.previewRange()).toBe('Select a date range');

    component.form.controls.startDate.setValue('2026-12-04');
    component.form.controls.endDate.setValue('2026-12-16');
    fixture.detectChanges();

    expect(component.workingDays()).toBe(9);
    expect(component.previewRange()).toContain('Dec 4');
    expect(component.previewRange()).toContain('Dec 16');
  });
});
