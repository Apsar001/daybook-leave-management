import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

function isAuthExempt(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const exempt = isAuthExempt(request.url);
  const token = auth.accessToken();

  const authorized = !exempt && token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || exempt) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap(() => {
          const refreshedToken = auth.accessToken();
          const retried = refreshedToken
            ? request.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } })
            : request;
          return next(retried);
        }),
        catchError((refreshError: unknown) => {
          auth.clearSession();
          const returnUrl = router.url && router.url !== '/login' ? router.url : null;
          void router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : undefined });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
