# Five-Minute Demo Checklist

| Time | Action | Talking point |
| --- | --- | --- |
| 0:00–0:30 | Open `/login` and sign in as `admin@leave.com` | Three roles only; no public registration |
| 0:30–1:15 | Admin dashboard → Leave Types → Settings → Holidays | Configuration is stored in PostgreSQL and affects validation immediately |
| 1:15–1:45 | Log out, sign in as `employee1@leave.com` | Employee navigation is role-scoped |
| 1:45–2:45 | Apply Leave: choose a range containing a weekend and holiday | Working-day preview excludes weekends/holidays; server recalculates |
| 2:45–3:15 | My Requests: show PENDING and attempt overlap | Pending reserves balance; overlap is blocked server-side |
| 3:15–4:15 | Sign in as `manager1@leave.com`; approve a pending request with a comment | Manager restricted to own reports; audit trail recorded |
| 4:15–4:40 | Team calendar and availability | Approved/pending/holidays have distinct indicators |
| 4:40–5:00 | Swagger `/api/docs` and `npm test` result | Documented API and 40 passing automated tests |

Backup talking points:

- Balances are computed from source requests, not trusted from Angular.
- Team coverage is checked for every affected working date.
- Refresh tokens rotate and are hashed in the database.
