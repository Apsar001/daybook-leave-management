# Migrations

Canonical migration: `backend/src/database/migrations/1700000000000-InitialMigration.ts`.

It creates all required tables, UUID primary keys, foreign keys, checks and indexes. Run it with:

```bash
npm run migration:run
```
