import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LeaveBalance, LeaveRequest, User } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  getMe(): Observable<User> {
    return this.api.get<User>('/users/me');
  }

  getBalance(year: number): Observable<LeaveBalance[]> {
    return this.api.get<LeaveBalance[]>('/users/me/balance', { year });
  }

  getMyRequests(): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>('/users/me/requests');
  }
}
