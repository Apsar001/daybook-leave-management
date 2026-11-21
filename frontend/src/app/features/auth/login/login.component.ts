import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <div class="auth-page">
      <section class="auth-brand-panel">
        <div class="brand">
          <span class="brand-mark">LF</span>
          <span>
            <span class="brand-name">LeaveFlow</span><br />
            <span class="brand-sub">Leave management</span>
          </span>
        </div>

        <div class="auth-hero">
          <h1>Time away, beautifully managed.</h1>
          <p>
            One calm workspace for requesting leave, balancing teams and keeping everyone in the
            loop — without the spreadsheet chaos.
          </p>
          <ul class="auth-feature-list">
            <li>
              <span class="feature-icon"><app-icon name="sparkles" [size]="16" /></span> Effortless
              leave requests
            </li>
            <li>
              <span class="feature-icon"><app-icon name="approvals" [size]="16" /></span> Clear
              approval workflows
            </li>
            <li>
              <span class="feature-icon"><app-icon name="calendar" [size]="16" /></span> Live team
              availability
            </li>
          </ul>
        </div>

        <div style="color: #8f9dbd; font-size: 11px;">
          © {{ currentYear }} LeaveFlow. Built for modern teams.
        </div>
      </section>

      <section class="auth-form-panel">
        <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <h2>Welcome back</h2>
          <p>Sign in to continue to your workspace.</p>

          @if (errorMessage()) {
            <div class="alert alert-error" role="alert" aria-live="assertive">
              {{ errorMessage() }}
            </div>
          }

          <div class="form-field">
            <label class="form-label" for="email"
              >Email address<span class="required">*</span></label
            >
            <input
              id="email"
              type="email"
              autocomplete="username"
              class="form-control"
              formControlName="email"
              placeholder="you@company.com"
              [attr.aria-invalid]="isInvalid('email')"
            />
            @if (isInvalid('email')) {
              <span class="form-error" role="alert">Enter a valid email address.</span>
            }
          </div>

          <div class="form-field" style="margin-top: 16px;">
            <label class="form-label" for="password">Password<span class="required">*</span></label>
            <div class="input-with-action">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                class="form-control"
                formControlName="password"
                placeholder="Enter your password"
                [attr.aria-invalid]="isInvalid('password')"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16" />
              </button>
            </div>
            @if (isInvalid('password')) {
              <span class="form-error" role="alert">Password is required.</span>
            }
          </div>

          <label class="checkbox-row" style="margin: 16px 0 20px;">
            <input type="checkbox" formControlName="remember" />
            Remember me on this device
          </label>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
              Signing in…
            } @else {
              Sign in <app-icon name="arrow-right" [size]="16" />
            }
          </button>

          <div class="demo-box">
            <h3>Demo accounts</h3>
            <button
              type="button"
              class="demo-account"
              (click)="useDemo('employee1@leave.com', 'Demo@12345')"
            >
              <span>Employee</span><code>employee1@leave.com</code>
            </button>
            <button
              type="button"
              class="demo-account"
              (click)="useDemo('manager1@leave.com', 'Demo@12345')"
            >
              <span>Manager</span><code>manager1@leave.com</code>
            </button>
            <button
              type="button"
              class="demo-account"
              (click)="useDemo('admin@leave.com', 'Demo@12345')"
            >
              <span>Admin</span><code>admin@leave.com</code>
            </button>
            <p class="form-hint" style="margin-top: 8px;">
              Password for all demo accounts: <code>Demo@12345</code>
            </p>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly currentYear = new Date().getFullYear();

  private returnUrl = '';

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.returnUrl = params.get('returnUrl') ?? '';
    });
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login(email, password, remember).subscribe({
      next: () => {
        this.loading.set(false);
        this.notifications.success('Welcome back!');
        const target =
          this.returnUrl && this.returnUrl.startsWith('/')
            ? this.returnUrl
            : this.auth.landingRoute();
        void this.router.navigateByUrl(target, { replaceUrl: true });
      },
      error: (error: { messages?: string[]; message?: string }) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.messages?.join(' ') || error.message || 'Unable to sign in. Please try again.',
        );
      },
    });
  }

  isInvalid(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  useDemo(email: string, password: string): void {
    this.form.patchValue({ email, password });
    this.form.markAsTouched();
  }
}
