/**
 * Variabilele minime cerute de validarea de configurație, ca testele unitare să
 * poată importa namespace-urile din `src/config` fără un `.env` real.
 */
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/auth_nest_test?schema=public',
  COOKIE_SECRET: 'test-cookie-secret-value-000000000000000',
  SESSION_SECRET: 'test-session-secret-value-00000000000000',
  REDIS_HOST: 'localhost',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
