import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '../.env'), quiet: true });
dotenv.config({ path: resolve(process.cwd(), '.env'), quiet: true });

/** SQLite/sql.js has no timestamptz type; PostgreSQL uses one for audit timestamps. */
export const DATABASE_DATE_TIME_TYPE: 'datetime' | 'timestamptz' =
  process.env.DB_TYPE === 'sqljs' ? 'datetime' : 'timestamptz';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const developmentAccessSecret = 'local-dev-access-secret-change-me';
const developmentRefreshSecret = 'local-dev-refresh-secret-change-me';

const jwtAccessSecret =
  process.env.JWT_ACCESS_SECRET ||
  (isProduction ? '' : developmentAccessSecret);
const jwtRefreshSecret =
  process.env.JWT_REFRESH_SECRET ||
  (isProduction ? '' : developmentRefreshSecret);

if (isProduction && (!jwtAccessSecret || !jwtRefreshSecret)) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be explicitly set in production',
  );
}
if (
  isProduction &&
  (/change-me|replace-with/i.test(jwtAccessSecret) ||
    /change-me|replace-with/i.test(jwtRefreshSecret))
) {
  console.warn(
    '[SECURITY] Placeholder JWT secrets detected in production. Replace them immediately.',
  );
}

export const env = {
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  apiPrefix: process.env.API_PREFIX || 'api',
  port: Number(process.env.PORT || 3000),
};

/** Converts durations such as 15m, 12h, 7d or a numeric seconds value to seconds. */
export function parseDuration(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = /^(\d+)([smhd]?)$/i.exec(String(value).trim());
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  return amount * 86400;
}
