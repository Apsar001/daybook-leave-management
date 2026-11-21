import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastContainerComponent],
  template: `
    <div class="app-shell">
      @if (sidebarOpen()) {
        <div class="sidebar-overlay" (click)="sidebarOpen.set(false)" aria-hidden="true"></div>
      }

      <aside class="sidebar" [class.open]="sidebarOpen()" aria-label="Main navigation">
        <div class="brand">
          <span class="brand-mark">LF</span>
          <span>
            <span class="brand-name">LeaveFlow</span><br />
            <span class="brand-sub">Workspace</span>
          </span>
        </div>

        <div class="nav-label">Workspace</div>
        <nav class="nav-list">
          @for (item of navItems(); track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="closeMenus()"
            >
              <app-icon [name]="item.icon" [size]="18" />
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          Signed in as {{ auth.currentUser()?.fullName || 'Team member' }}
        </div>
      </aside>

      <div class="main-column">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" class="icon-button mobile-menu-button" (click)="sidebarOpen.set(true)" aria-label="Open navigation">
              <app-icon name="menu" />
            </button>
            <div>
              <div class="breadcrumb"><span>Workspace</span><span>/</span><span>{{ pageTitle() }}</span></div>
              <div class="topbar-title">{{ pageTitle() }}</div>
            </div>
          </div>

          <div class="topbar-actions">
            <span class="badge neutral" style="text-transform: capitalize;">{{ auth.role()?.toLowerCase() || 'member' }}</span>
            <button type="button" class="user-chip" (click)="userMenuOpen.set(!userMenuOpen())" [attr.aria-expanded]="userMenuOpen()">
              <span class="avatar">{{ initials() }}</span>
              <span class="user-meta">
                <span class="user-name">{{ auth.currentUser()?.fullName || 'Account' }}</span><br />
                <span class="user-role">{{ auth.role()?.toLowerCase() || 'member' }}</span>
              </span>
              <app-icon name="chevron-down" [size]="14" />
            </button>
          </div>
        </header>

        @if (userMenuOpen()) {
          <div class="user-popover" role="menu">
            <button type="button" role="menuitem" routerLink="/profile" (click)="closeMenus()">
              <app-icon name="profile" [size]="16" /> My profile
            </button>
            <button type="button" role="menuitem" class="danger" (click)="logout()">
              <app-icon name="logout" [size]="16" /> Sign out
            </button>
          </div>
        }

        <main class="content">
          <router-outlet />
        </main>
      </div>

      <app-toast-container />
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly userMenuOpen = signal(false);
  private readonly routeData = signal<Data>({});

  readonly pageTitle = computed<string>(() => {
    const value = this.routeData()['title'];
    return typeof value === 'string' ? value : 'Dashboard';
  });

  readonly initials = computed<string>(() => {
    const name = this.auth.currentUser()?.fullName ?? 'User';
    return name
      .split(' ')
      .filter((part) => part.trim())
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  readonly navItems = computed<NavItem[]>(() => {
    switch (this.auth.role()) {
      case 'ADMIN':
        return [
          { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
          { label: 'Leave Types', route: '/admin/leave-types', icon: 'types' },
          { label: 'Settings', route: '/admin/settings', icon: 'settings' },
          { label: 'Holidays', route: '/admin/holidays', icon: 'holidays' },
          { label: 'Profile', route: '/profile', icon: 'profile' },
        ];
      case 'MANAGER':
        return [
          { label: 'Dashboard', route: '/manager/dashboard', icon: 'dashboard' },
          { label: 'Approvals', route: '/manager/approvals', icon: 'approvals' },
          { label: 'Team', route: '/manager/team', icon: 'team' },
          { label: 'Calendar', route: '/manager/calendar', icon: 'calendar' },
          { label: 'Profile', route: '/profile', icon: 'profile' },
        ];
      default:
        return [
          { label: 'Dashboard', route: '/employee/dashboard', icon: 'dashboard' },
          { label: 'Apply Leave', route: '/employee/apply-leave', icon: 'apply' },
          { label: 'My Requests', route: '/employee/my-requests', icon: 'requests' },
          { label: 'My Balance', route: '/employee/my-balance', icon: 'balance' },
          { label: 'Calendar', route: '/employee/calendar', icon: 'calendar' },
          { label: 'Profile', route: '/profile', icon: 'profile' },
        ];
    }
  });

  constructor() {
    this.routeData.set(this.deepest(this.router.routerState.snapshot.root).data);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.routeData.set(this.deepest(this.router.routerState.snapshot.root).data);
      this.closeMenus();
    });
  }

  closeMenus(): void {
    this.sidebarOpen.set(false);
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeMenus();
    this.auth.logout();
  }

  private deepest(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = snapshot;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
