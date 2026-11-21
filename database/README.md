# Database

The executable database assets are intentionally colocated with the NestJS application so TypeORM can import them directly:

- `backend/src/database/entities/` — TypeORM entities
- `backend/src/database/migrations/1700000000000-InitialMigration.ts` — PostgreSQL migration
- `backend/src/database/seeds/seed.ts` — repeatable demo seed

Use the root scripts:

```bash
npm run migration:run
npm run migration:revert
npm run seed
```

See `docs/database.md` for the schema and constraints.
