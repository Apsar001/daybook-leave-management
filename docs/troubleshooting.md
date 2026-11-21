# Troubleshooting

## PostgreSQL connection

- Confirm Docker Compose is running: `docker compose ps`.
- Verify `.env` values match `docker-compose.yml`.
- Run `npm run migration:run` before `npm run seed`.

## Authentication

- A 401 means the access token is missing/expired. The Angular interceptor attempts one refresh; otherwise sign in again.
- A 403 on approval means the request belongs to another manager’s report. This is the intended security rule.
- Clear browser storage if an old token remains after reseeding.

## Build and tests

- Delete `node_modules`, `package-lock.json`, and re-run `npm install` if dependencies become inconsistent.
- Angular cache issues: remove `frontend/.angular`.
- Backend tests do not require PostgreSQL; they use SQL.js in memory.
- Native install-script warnings are usually safe; approve `esbuild`/`@parcel/watcher` scripts only if the build needs them.

## Data

- `npm run seed` intentionally resets demo rows. Do not run it against production data.
- To verify seed counts, query the API with the admin account and check `/api/admin/statistics`.
