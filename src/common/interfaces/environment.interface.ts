import type { StringValue } from 'ms';

export interface EnvironmentInterface {
  // App
  NODE_ENV: string;
  APP_NAME: string;
  APP_URL: string;
  APP_PORT: number;

  // CORS
  CORS_ORIGIN: string;

  // Database
  DATABASE_URL: string;

  // Security / hashing
  BCRYPT_SALT: number;

  // Cookies
  COOKIE_SECRET: string;

  // Session
  SESSION_SECRET: string;
  SESSION_NAME: string;
  SESSION_DOMAIN: string;
  SESSION_MAX_AGE: StringValue;
  SESSION_SECURE: string;
  SESSION_FOLDER: string;

  // Redis
  REDIS_USER: string;
  REDIS_PASSWORD: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_URL: string;

  // Mail
  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_SECURE: boolean;
  MAIL_USER: string;
  MAIL_PASSWORD: string;
  MAIL_FROM: string;

  // Rate limiting
  THROTTLE_SHORT_TTL: StringValue;
  THROTTLE_SHORT_LIMIT: number;
  THROTTLE_MEDIUM_TTL: StringValue;
  THROTTLE_MEDIUM_LIMIT: number;
  THROTTLE_LONG_TTL: StringValue;
  THROTTLE_LONG_LIMIT: number;
}
