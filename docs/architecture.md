# Architecture Notes

## Modules

| NestJS module | Responsibility |
| --- | --- |
| `AuthModule` | Login, refresh rotation, logout, JWT strategy |
| `UsersModule` | Profile, balance and request history for the current user |
| `LeaveRequestsModule` | Creation, cancellation, viewer-scoped reads |
| `ManagerModule` | Team queries and own-report approval workflow |
| `AdminModule` | Settings, leave types, holidays, statistics, teams |
| `CalendarModule` | Monthly calendar and availability projection |
| `WorkingDaysModule` | Reusable date-only working-day calculation |
| `LeaveBalanceModule` | Authoritative balance calculation and snapshots |
| `OverlapCheckModule` | Employee overlap and team-coverage validation |
| `SettingsModule` | Typed access to `system_settings` |
| `NotificationsModule` | Persisted user notifications |

## Security model

- `JwtAuthGuard` authenticates all non-`@Public()` routes.
- `RolesGuard` enforces `@Roles(...)` metadata on manager and admin controllers.
- Ownership checks are performed in services:
  - employee requests are scoped to `request.employeeId === currentUser.id`;
  - manager decisions require `request.employee.managerId === currentUser.id`;
  - calendar team IDs are forced for employees/managers, never trusted from the client.
- Passwords are bcrypt hashes. Refresh tokens are stored as SHA-256 hashes and revoked on rotation/logout.
- Refresh rotation is transactional and row-locked. Presenting an already-rotated token revokes every active token for that user (replay detection).
- JWT secrets have development fallbacks only; production startup fails fast when they are not explicitly configured.
- ValidationPipe whitelists DTOs and rejects unknown fields.

## Transaction strategy

`LeaveRequestsService.create`, `cancel`, `ManagerService.decide`, and `AuthService.refresh` use `DataSource.transaction`. On PostgreSQL, employee, team, request and refresh-token rows are locked with `pessimistic_write` before balance/coverage checks. SQL.js tests use its single-writer transaction semantics. Balance rows are recalculated from source requests inside the same transaction, so a rejected/cancelled request cannot consume balance and an approved request cannot be double counted. Approval re-runs overlap, coverage and allowance checks inside the transaction, so configuration changes made after submission are still enforced.

## Configuration behaviour

No leave rule values are hardcoded in business logic:

- `min_notice_days` and `max_team_members_off` are read from `system_settings` on each request.
- Leave-type allowances come from `leave_types` and are mirrored into current/future `leave_balances` rows.
- Public holidays come from `public_holidays`.

Changing a setting through the admin API changes subsequent validation immediately.
