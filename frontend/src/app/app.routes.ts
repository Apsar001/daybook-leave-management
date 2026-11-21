import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { LandingComponent } from './layout/landing/landing.component';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', component: LandingComponent },
      {
        path: 'employee/dashboard',
        title: 'Dashboard',
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE'] },
        loadComponent: () =>
          import('./features/employee/dashboard/employee-dashboard.component').then((m) => m.EmployeeDashboardComponent),
      },
      {
        path: 'employee/apply-leave',
        title: 'Apply Leave',
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE'] },
        loadComponent: () =>
          import('./features/employee/apply-leave/apply-leave.component').then((m) => m.ApplyLeaveComponent),
      },
      {
        path: 'employee/my-requests',
        title: 'My Requests',
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE'] },
        loadComponent: () =>
          import('./features/employee/my-requests/my-requests.component').then((m) => m.MyRequestsComponent),
      },
      {
        path: 'employee/my-balance',
        title: 'My Balance',
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE'] },
        loadComponent: () =>
          import('./features/employee/my-balance/my-balance.component').then((m) => m.MyBalanceComponent),
      },
      {
        path: 'employee/calendar',
        title: 'Calendar',
        canActivate: [roleGuard],
        data: { roles: ['EMPLOYEE'] },
        loadComponent: () =>
          import('./features/employee/calendar/leave-calendar.component').then((m) => m.LeaveCalendarComponent),
      },
      {
        path: 'manager/dashboard',
        title: 'Dashboard',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () =>
          import('./features/manager/dashboard/manager-dashboard.component').then((m) => m.ManagerDashboardComponent),
      },
      {
        path: 'manager/approvals',
        title: 'Approvals',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () =>
          import('./features/manager/approvals/approvals.component').then((m) => m.ApprovalsComponent),
      },
      {
        path: 'manager/team',
        title: 'Team',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () => import('./features/manager/team/team.component').then((m) => m.TeamComponent),
      },
      {
        path: 'manager/calendar',
        title: 'Calendar',
        canActivate: [roleGuard],
        data: { roles: ['MANAGER'] },
        loadComponent: () =>
          import('./features/employee/calendar/leave-calendar.component').then((m) => m.LeaveCalendarComponent),
      },
      {
        path: 'admin/dashboard',
        title: 'Dashboard',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'admin/leave-types',
        title: 'Leave Types',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/admin/leave-types/leave-types.component').then((m) => m.LeaveTypesComponent),
      },
      {
        path: 'admin/settings',
        title: 'Settings',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/admin/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'admin/holidays',
        title: 'Holidays',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () =>
          import('./features/admin/holidays/holidays.component').then((m) => m.HolidaysComponent),
      },
      {
        path: 'profile',
        title: 'Profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
