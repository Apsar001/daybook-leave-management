# Database Reference

Canonical files:

- Migration: `backend/src/database/migrations/1700000000000-InitialMigration.ts`
- Seed: `backend/src/database/seeds/seed.ts`
- Entities: `backend/src/database/entities/`

## Tables and constraints

| Table | Key constraints / indexes |
| --- | --- |
| `users` | unique email; indexes on role and manager_id; role CHECK; FKs to teams and users |
| `teams` | unique name; manager FK to users |
| `leave_types` | unique name; allowance >= 0 CHECK |
| `leave_requests` | FKs to users/leave_types; date and working-day CHECKs; indexes on employee+status, dates, status |
| `leave_balances` | unique (user_id, leave_type_id, year); indexes on user+year; non-negative stored totals |
| `public_holidays` | unique date |
| `approval_history` | FK to request and actor; action CHECK |
| `system_settings` | unique key |
| `notifications` | index on user+is_read |
| `refresh_tokens` | unique token hash; expiry and revocation columns |

## Balance calculation

For each user/type/year:

```text
pending  = SUM(working_days) where status = PENDING
approved = SUM(working_days) where status = APPROVED
available = allowance - approved - pending
```

Requests are selected when their date range overlaps the target year, and only the working dates falling inside that year are counted. A request spanning New Year is therefore divided between both years. Rejected and cancelled rows are ignored. The service recalculates inside the same transaction as status changes.

## Seed dataset

- 1 admin, 2 managers, 8 employees across 2 teams.
- Annual Leave 20 days, Sick Leave 10 days, Unpaid Leave 5 days.
- Public holidays for the current year.
- 40 requests in PENDING, APPROVED, REJECTED and CANCELLED states, generated with future-dated holidays/weekends avoided, no employee overlap, no balance overflow and no team-coverage violation.

Run `npm run seed` to reset and recreate this dataset.
