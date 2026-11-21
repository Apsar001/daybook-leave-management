# REST API

Base URL: `http://localhost:3000/api`. Swagger UI: `/api/docs`.

All endpoints except `/auth/login`, `/auth/refresh`, `/auth/logout` and `/health` require `Authorization: Bearer <accessToken>`.

## Authentication

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` | Returns access token, refresh token, expiry and user |
| POST | `/auth/refresh` | `{ refreshToken }` | Rotates refresh token |
| POST | `/auth/logout` | `{ refreshToken }` | Revokes refresh token |
| GET | `/auth/me` | — | Current user |

## Employee / shared

| Method | Path | Description |
| --- | --- | --- |
| GET | `/users/me` | Profile |
| GET | `/users/me/balance?year=` | Balance per leave type |
| GET | `/users/me/requests?status=&year=` | Own request history |
| POST | `/leave-requests` | Submit request |
| GET | `/leave-requests/:id` | Own request, own report, or any for admin |
| POST | `/leave-requests/:id/cancel` | Cancel eligible own request |
| GET | `/leave-types` | Active leave types |
| GET | `/calendar?year=&month=&teamId=` | Monthly calendar |
| GET | `/notifications` | Own notifications |

## Manager

| Method | Path | Description |
| --- | --- | --- |
| GET | `/manager/team` | Own reports with balances |
| GET | `/manager/pending-requests` | Pending requests from own reports |
| GET | `/manager/team-history?status=&year=` | Team history |
| GET | `/manager/availability?date=` | Availability for a date |
| POST | `/manager/requests/:id/approve` | Approve own-report pending request |
| POST | `/manager/requests/:id/reject` | Reject own-report pending request |

## Admin

| Method | Path | Description |
| --- | --- | --- |
| GET/PUT | `/admin/settings` | Read/update `minNoticeDays`, `maxTeamMembersOff` |
| GET/POST | `/admin/leave-types` | List/create leave types |
| PUT | `/admin/leave-types/:id` | Update name, allowance, active flag, colour |
| GET/POST | `/admin/holidays` | List/add holidays |
| DELETE | `/admin/holidays/:id` | Remove holiday |
| GET | `/admin/statistics` | System-wide counts |
| GET | `/admin/teams` | Teams, member counts and managers |

## Error format

```json
{
  "statusCode": 400,
  "message": "Insufficient Annual Leave balance: 1 day(s) available, 2 requested",
  "error": "Bad Request"
}
```

Common codes: `400` validation/business rule, `401` authentication, `403` authorization, `404` not found, `409` duplicate configuration.
