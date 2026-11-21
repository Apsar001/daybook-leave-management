import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Role } from '../models/api.models';
import { AuthService } from '../services/auth.service';

function allowedRoles(route: ActivatedRouteSnapshot): Role[] {
  const data = route.data['roles'];
  return Array.isArray(data) ? (data as Role[]) : [];
}

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = allowedRoles(route);

  if (!roles.length || auth.hasRole(...roles)) {
    return true;
  }

  return router.createUrlTree([auth.landingRoute()]);
};
