import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppError } from '../models/api.models';

export class ApiRequestError extends Error implements AppError {
  readonly messages: string[];
  readonly status: number;

  constructor(messages: string[], status: number) {
    super(messages.join(' '));
    this.name = 'ApiRequestError';
    this.messages = messages;
    this.status = status;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function normalizeApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error;
  }

  const httpError = error as HttpErrorResponse | null;
  const status = httpError?.status ?? 0;
  const payload = asRecord(httpError?.error);
  const rawMessage = payload?.['message'];

  let messages: string[] = [];
  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    messages = [rawMessage];
  } else if (Array.isArray(rawMessage)) {
    messages = rawMessage.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } else if (typeof httpError?.message === 'string' && httpError.message.trim()) {
    messages = [httpError.message];
  }

  if (!messages.length) {
    const errorLabel = typeof payload?.['error'] === 'string' ? String(payload['error']) : 'Request failed';
    messages = status ? [`${errorLabel} (${status})`] : [errorLabel];
  }

  return new ApiRequestError(messages, status);
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  post<T>(path: string, body?: unknown, params?: QueryParams): Observable<T> {
    return this.request<T>('POST', path, body, params);
  }

  put<T>(path: string, body?: unknown, params?: QueryParams): Observable<T> {
    return this.request<T>('PUT', path, body, params);
  }

  delete<T>(path: string, params?: QueryParams): Observable<T> {
    return this.request<T>('DELETE', path, undefined, params);
  }

  private request<T>(method: string, path: string, body?: unknown, params?: QueryParams): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      }
    }

    return this.http
      .request<T>(method, `${this.baseUrl}${path}`, {
        body,
        params: httpParams.keys().length ? httpParams : undefined,
      })
      .pipe(
        catchError((error: unknown) => {
          const normalized = normalizeApiError(error);
          return throwError(() => normalized);
        }),
      );
  }
}
