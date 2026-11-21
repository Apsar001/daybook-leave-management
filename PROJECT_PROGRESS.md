# Project Progress Checklist

## Phase 1 — Project Initialization
- [x] Inspected workspace (empty)
- [x] Created monorepo root files
- [x] Angular 22 application initialized
- [x] NestJS 11 application initialized
- [x] PostgreSQL/TypeORM configured (with SQL.js test fallback)
- [x] Environment variables configured
- [x] Dependency compatibility verified

## Phase 2 — Database
- [x] 10 normalized entities designed
- [x] PostgreSQL migration created
- [x] Repeatable seed script created (1 admin, 2 managers, 8 employees, 3 leave types, 40 requests)
- [x] Database connectivity verified via SQL.js seed run; PostgreSQL migration definition reviewed

## Phase 3 — Backend
- [x] Authentication, refresh rotation and logout
- [x] Three roles and RBAC guards
- [x] User/team APIs
- [x] Leave types, settings and holidays
- [x] Working-day calculation
- [x] Leave balance calculation
- [x] Overlap/team coverage validation with transactions and PostgreSQL row locks
- [x] Approval workflow and audit trail
- [x] Cancellation
- [x] Calendar and availability APIs
- [x] Swagger documentation

## Phase 4 — Frontend
- [x] Design system and reusable components
- [x] Login with remember-me and password visibility
- [x] Employee dashboard, apply leave, requests, balance, calendar
- [x] Manager dashboard, approvals, team, calendar
- [x] Admin dashboard, leave types, settings, holidays
- [x] Balance charts and monthly calendar
- [x] Full API integration with guards and auto-refresh interceptor

## Phase 5 — Testing
- [x] 40 backend unit/integration tests pass
- [x] Authorization and ownership tests
- [x] Business rule tests
- [x] Configuration behaviour tests
- [x] Frontend tests pass (3 tests)

## Phase 6 — Finalization
- [x] Backend production build succeeds
- [x] Frontend production build succeeds (320 kB initial bundle)
- [x] Backend lint clean
- [x] Migration/seed reviewed and seed executed on SQL.js
- [x] Review findings fixed: production JWT fail-fast, blank-reason validation, approval-time revalidation, year-crossing balances, atomic refresh rotation with replay detection, transactional allowance updates
- [x] Team manager relation mapping fixed (single `manager_id` column); seed and test fixtures assign managers after users so admin team coverage shows correct managers
- [x] Apply Leave preview/validation fixed: form values now feed a signal so the working-day count updates instead of staying stale at 0; regression test added
- [x] Seed refactored into reusable `seedDatabase(dataSource)` with CLI entry point preserved
- [x] Frontend demo account shortcuts aligned with the seeded credentials
- [x] Browser smoke test passed: login and admin dashboard render correctly
- [x] README and docs complete
- [x] Demo checklist complete
- [ ] PostgreSQL/Docker runtime smoke test (not available in this environment; configuration reviewed)
