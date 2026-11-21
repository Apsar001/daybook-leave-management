import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CalendarMonth } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly api = inject(ApiService);

  getMonth(year: number, month: number, teamId?: string | null): Observable<CalendarMonth> {
    return this.api.get<CalendarMonth>('/calendar', { year, month, teamId: teamId || undefined });
  }
}
