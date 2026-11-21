import { Component, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { User } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IconComponent, LoadingStateComponent, PageHeaderComponent],
  template: `
    <app-page-header title="My profile" subtitle="Your account details and current session.">
      <button type="button" class="btn btn-danger" (click)="auth.logout()">
        <app-icon name="logout" [size]="16" /> Sign out
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="card"><app-loading-state message="Loading profile…" /></div>
    } @else if (user(); as profile) {
      <div class="grid grid-main-side">
        <section class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Account details</div>
              <div class="card-subtitle">Information linked to your login</div>
            </div>
          </div>
          <div class="card-body">
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
              <span class="avatar large">{{ initials(profile.fullName) }}</span>
              <div>
                <h2>{{ profile.fullName }}</h2>
                <div class="cell-muted">{{ profile.email }}</div>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">Role</div>
                <div class="detail-value" style="text-transform: capitalize;">{{ profile.role?.toLowerCase() }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Team</div>
                <div class="detail-value">{{ profile.teamName || 'Not assigned' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Manager</div>
                <div class="detail-value">{{ profile.managerId ? 'Assigned' : 'Not assigned' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">User ID</div>
                <div class="detail-value" style="font-size: 11px;">{{ profile.id }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><div class="card-title">Session</div></div>
          <div class="card-body">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value"><span class="badge success">Authenticated</span></div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Session storage</div>
                <div class="detail-value">{{ auth.rememberMe() ? 'This browser (remembered)' : 'Current tab only' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Authentication</div>
                <div class="detail-value">Bearer token</div>
              </div>
            </div>
            <p class="form-hint" style="margin-top: 16px;">
              Signing out clears the local session and calls the logout endpoint.
            </p>
          </div>
        </section>
      </div>
    } @else {
      <div class="card"><div class="empty-state"><strong>Profile unavailable</strong><span>We could not load your account details.</span></div></div>
    }
  `,
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly user = signal<User | null>(this.auth.currentUser());
  readonly loading = signal(true);

  constructor() {
    this.auth
      .loadMe()
      .pipe(catchError(() => this.userService.getMe()))
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        this.user.set(user);
        this.loading.set(false);
      });
  }

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
