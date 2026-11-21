import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateLeaveTypePayload,
  LeaveType,
  UpdateLeaveTypePayload,
} from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class LeaveTypeService {
  private readonly api = inject(ApiService);

  getActive(): Observable<LeaveType[]> {
    return this.api.get<LeaveType[]>('/leave-types');
  }

  adminList(): Observable<LeaveType[]> {
    return this.api.get<LeaveType[]>('/admin/leave-types');
  }

  create(payload: CreateLeaveTypePayload): Observable<LeaveType> {
    return this.api.post<LeaveType>('/admin/leave-types', payload);
  }

  update(id: string, payload: UpdateLeaveTypePayload): Observable<LeaveType> {
    return this.api.put<LeaveType>(`/admin/leave-types/${encodeURIComponent(id)}`, payload);
  }
}
