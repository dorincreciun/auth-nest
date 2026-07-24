import type { StringValue } from 'ms';

export interface EnvironmentInterface {
  NODE_ENV: string;

  APP_NAME: string;
  APP_URL: string;
  APP_PORT: number;

  DATABASE_URL: string;

  BCRYPT_SALT: number;

  COOKIE_SECRET: string;

  SESSION_SECRET: string;
  SESSION_NAME: string;
  SESSION_DOMAIN: string;
  SESSION_MAX_AGE: StringValue;
  SESSION_HTTP_ONLY: string;
  SESSION_SECURE: string;
  SESSION_FOLDER: string;

  REDIS_USER: string;
  REDIS_PASSWORD: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_URL: string;

  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_SECURE: boolean;
  MAIL_USER: string;
  MAIL_PASSWORD: string;
  MAIL_FROM: string;
}
