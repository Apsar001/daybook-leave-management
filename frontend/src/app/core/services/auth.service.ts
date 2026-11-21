import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginResponse, RefreshResponse, Role, User } from '../models/api.models';
import { normalizeApiError } from './api.service';
import { StoredSession, TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly session = signal<StoredSession | null>(this.storage.getSession());

  readonly currentUser = computed<User | null>(() => this.session()?.user ?? null);
  readonly accessToken = computed<string | null>(() => this.session()?.accessToken ?? null);
  readonly isAuthenticated = computed<boolean>(
    () => Boolean(this.session()?.accessToken) && Boolean(this.session()?.user),
  );
  readonly role = computed<Role | null>(() => this.session()?.user?.role ?? null);
  readonly isEmployee = computed<boolean>(() => this.role() === 'EMPLOYEE');
  readonly isManager = computed<boolean>(() => this.role() === 'MANAGER');
  readonly isAdmin = computed<boolean>(() => this.role() === 'ADMIN');
  readonly rememberMe = computed<boolean>(() => Boolean(this.session()?.remember));

  login(email: string, password: string, remember = false): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.storage.saveLogin(response, remember);
          this.session.set(this.storage.getSession());
        }),
        catchError((error: unknown) => throwError(() => normalizeApiError(error))),
      );
  }

  refresh(): Observable<RefreshResponse> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No active refresh token.'));
    }
    return this.http
      .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          this.storage.saveRefresh(response);
          this.session.set(this.storage.getSession());
        }),
        catchError((error: unknown) => throwError(() => normalizeApiError(error))),
      );
  }

  loadMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this.storage.updateUser(user);
        this.session.set(this.storage.getSession());
      }),
      catchError((error: unknown) => throwError(() => normalizeApiError(error))),
    );
  }

  logout(navigate = true): void {
    const refreshToken = this.storage.getRefreshToken();
    if (refreshToken) {
      this.http
        .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
        .pipe(catchError(() => throwError(() => null)))
        .subscribe({ next: () => undefined, error: () => undefined });
    }
    this.clearSession();
    if (navigate) {
      void this.router.navigate(['/login']);
    }
  }

  clearSession(): void {
    this.storage.clear();
    this.session.set(null);
  }

  hasRole(...roles: Role[]): boolean {
    const current = this.role();
    return current !== null && roles.includes(current);
  }

  landingRoute(): string {
    switch (this.role()) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'MANAGER':
        return '/manager/dashboard';
      default:
        return '/employee/dashboard';
    }
  }
}
