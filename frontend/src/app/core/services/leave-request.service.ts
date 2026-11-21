import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
  RequestStatus,
} from '../models/api.models';
import { ApiService, QueryParams } from './api.service';

@Injectable({ providedIn: 'root' })
export class LeaveRequestService {
  private readonly api = inject(ApiService);

  create(payload: CreateLeaveRequestPayload): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>('/leave-requests', payload);
  }

  list(filters: { status?: RequestStatus | ''; year?: number } = {}): Observable<LeaveRequest[]> {
    const params: QueryParams = {};
    if (filters.status) {
      params['status'] = filters.status;
    }
    if (filters.year) {
      params['year'] = filters.year;
    }
    return this.api.get<LeaveRequest[]>('/leave-requests', params);
  }

  getById(id: string): Observable<LeaveRequest> {
    return this.api.get<LeaveRequest>(`/leave-requests/${encodeURIComponent(id)}`);
  }

  cancel(id: string, comment?: string): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>(`/leave-requests/${encodeURIComponent(id)}/cancel`, {
      comment: comment || undefined,
    });
  }
}
