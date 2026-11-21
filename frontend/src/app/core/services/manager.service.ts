import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LeaveRequest, RequestStatus, TeamAvailability, TeamMember } from '../models/api.models';
import { ApiService, QueryParams } from './api.service';

@Injectable({ providedIn: 'root' })
export class ManagerService {
  private readonly api = inject(ApiService);

  getTeam(): Observable<TeamMember[]> {
    return this.api.get<TeamMember[]>('/manager/team');
  }

  getPendingRequests(): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>('/manager/pending-requests');
  }

  approve(id: string, comment?: string): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>(`/manager/requests/${encodeURIComponent(id)}/approve`, {
      comment: comment || undefined,
    });
  }

  reject(id: string, comment: string): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>(`/manager/requests/${encodeURIComponent(id)}/reject`, { comment });
  }

  getTeamHistory(filters: { status?: RequestStatus | ''; year?: number } = {}): Observable<LeaveRequest[]> {
    const params: QueryParams = {};
    if (filters.status) {
      params['status'] = filters.status;
    }
    if (filters.year) {
      params['year'] = filters.year;
    }
    return this.api.get<LeaveRequest[]>('/manager/team-history', params);
  }

  getAvailability(date: string): Observable<TeamAvailability> {
    return this.api.get<TeamAvailability>('/manager/availability', { date });
  }
}
