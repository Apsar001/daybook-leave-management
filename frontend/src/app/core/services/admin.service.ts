import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminSettings,
  AdminStatistics,
  AdminTeam,
  CreateHolidayPayload,
  Holiday,
} from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  getSettings(): Observable<AdminSettings> {
    return this.api.get<AdminSettings>('/admin/settings');
  }

  updateSettings(payload: { minNoticeDays?: number; maxTeamMembersOff?: number }): Observable<AdminSettings> {
    return this.api.put<AdminSettings>('/admin/settings', payload);
  }

  getHolidays(): Observable<Holiday[]> {
    return this.api.get<Holiday[]>('/admin/holidays');
  }

  createHoliday(payload: CreateHolidayPayload): Observable<Holiday> {
    return this.api.post<Holiday>('/admin/holidays', payload);
  }

  deleteHoliday(id: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`/admin/holidays/${encodeURIComponent(id)}`);
  }

  getStatistics(): Observable<AdminStatistics> {
    return this.api.get<AdminStatistics>('/admin/statistics');
  }

  getTeams(): Observable<AdminTeam[]> {
    return this.api.get<AdminTeam[]>('/admin/teams');
  }
}
