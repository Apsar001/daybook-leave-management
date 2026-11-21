import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSourceOptions } from 'typeorm';
import { InitialMigration1700000000000 } from '../database/migrations/1700000000000-InitialMigration';
import { allEntities } from '../database/entities';

dotenv.config({ path: resolve(process.cwd(), '../.env'), quiet: true });
dotenv.config({ path: resolve(process.cwd(), '.env'), quiet: true });

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function getDatabaseOptions(): DataSourceOptions {
  const type = (process.env.DB_TYPE || 'postgres').toLowerCase();

  if (type === 'sqljs') {
    return {
      type: 'sqljs',
      autoSave: false,
      synchronize: true,
      dropSchema: process.env.NODE_ENV === 'test',
      entities: allEntities,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: numberFromEnv(process.env.DB_PORT, 5432),
    username: process.env.DB_USERNAME || 'leave_user',
    password: process.env.DB_PASSWORD || 'leave_password',
    database: process.env.DB_NAME || 'leave_management',
    synchronize: false,
    migrationsRun: process.env.RUN_MIGRATIONS !== 'false',
    migrations: [InitialMigration1700000000000],
    entities: allEntities,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    logging:
      process.env.DB_LOGGING === 'true' ? ['error', 'migration'] : ['error'],
  };
}
