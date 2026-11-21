process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqljs';
process.env.JWT_ACCESS_SECRET =
  'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET =
  'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '7d';
process.env.BCRYPT_ROUNDS = '4';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.API_PREFIX = 'api';
process.env.FRONTEND_URL = 'http://localhost:4200';
