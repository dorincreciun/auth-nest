import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { StringValue } from 'ms';

import { ToBoolean, ToNumber, ToStringArray } from './transformers';
import { IsDuration } from './validators';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export const COOKIE_SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;

export type CookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number];

/**
 * Contractul complet de variabile de mediu al aplicației.
 *
 * Este singura sursă de adevăr pentru configurație: valorile sunt normalizate
 * (string → number/boolean/array), validate la pornire și abia apoi expuse
 * modulelor prin namespace-urile din `src/config`. Dacă o variabilă lipsește
 * sau e invalidă, aplicația refuză să pornească în loc să cadă la runtime.
 */
export class EnvironmentVariables {
  /* ── Aplicație ─────────────────────────────────────────────────────────── */

  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @IsString()
  @IsNotEmpty()
  APP_NAME = 'Nest Auth';

  /** Adresa de bind HTTP. În containere trebuie `0.0.0.0`, nu `localhost`. */
  @IsString()
  @IsNotEmpty()
  APP_HOST = '0.0.0.0';

  /** Păstrat pentru `.env`-urile existente; bind-ul folosește `APP_HOST`. */
  @IsString()
  @IsNotEmpty()
  APP_URL = '0.0.0.0';

  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(65535)
  APP_PORT = 5000;

  @IsString()
  API_PREFIX = 'api';

  @IsString()
  @IsNotEmpty()
  API_VERSION = '1';

  /** În `development` documentația e mereu activă; în `production` trebuie cerută explicit. */
  @ToBoolean()
  @IsBoolean()
  SWAGGER_ENABLED = false;

  /** Activează `trust proxy` în Express (necesar în spatele unui reverse proxy / load balancer). */
  @ToBoolean()
  @IsBoolean()
  TRUST_PROXY = false;

  /* ── CORS ──────────────────────────────────────────────────────────────── */

  /** Listă de origini permise, separate prin virgulă. */
  @ToStringArray()
  @IsUrl({ require_tld: false }, { each: true })
  CORS_ORIGIN: string[] = ['http://localhost:3000'];

  /* ── Bază de date ──────────────────────────────────────────────────────── */

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  /* ── Hashing & cookies ─────────────────────────────────────────────────── */

  @ToNumber()
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_SALT = 12;

  @IsString()
  @MinLength(32)
  COOKIE_SECRET: string;

  /* ── Sesiuni ───────────────────────────────────────────────────────────── */

  @IsString()
  @MinLength(32)
  SESSION_SECRET: string;

  @IsString()
  @IsNotEmpty()
  SESSION_NAME = 'sessionId';

  @IsString()
  @IsNotEmpty()
  SESSION_DOMAIN = 'localhost';

  @IsDuration()
  SESSION_MAX_AGE: StringValue = '30d';

  @ToBoolean()
  @IsBoolean()
  SESSION_SECURE = false;

  @IsIn(COOKIE_SAME_SITE_VALUES)
  SESSION_SAME_SITE: CookieSameSite = 'lax';

  /** Prefixul cheilor de sesiune din Redis. */
  @IsString()
  @IsNotEmpty()
  SESSION_FOLDER = 'sessions:';

  /* ── Redis ─────────────────────────────────────────────────────────────── */

  @IsString()
  REDIS_USER = 'default';

  @IsString()
  REDIS_PASSWORD = '';

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT = 6379;

  @ToBoolean()
  @IsBoolean()
  REDIS_TLS = false;

  @IsDuration()
  REDIS_CONNECT_TIMEOUT: StringValue = '10s';

  /* ── Email ─────────────────────────────────────────────────────────────── */

  @IsString()
  MAIL_HOST = '';

  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_PORT = 465;

  @ToBoolean()
  @IsBoolean()
  MAIL_SECURE = true;

  @IsString()
  MAIL_USER = '';

  @IsString()
  MAIL_PASSWORD = '';

  @IsString()
  MAIL_FROM = '';

  /* ── Cloudinary ────────────────────────────────────────────────────────── */

  @IsString()
  CLOUDINARY_CLOUD_NAME = '';

  @IsString()
  CLOUDINARY_API_KEY = '';

  @IsString()
  CLOUDINARY_API_SECRET = '';

  /* ── Coduri de verificare (OTP) ────────────────────────────────────────── */

  /** Secret dedicat pentru hash-ul codurilor OTP. Implicit se refolosește `SESSION_SECRET`. */
  @IsOptional()
  @IsString()
  @MinLength(32)
  TOKEN_SECRET?: string;

  @ToNumber()
  @IsInt()
  @Min(4)
  @Max(10)
  TOKEN_LENGTH = 6;

  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(20)
  TOKEN_MAX_ATTEMPTS = 5;

  @IsDuration()
  EMAIL_VERIFICATION_TOKEN_TTL: StringValue = '5m';

  @IsDuration()
  PASSWORD_RESET_TOKEN_TTL: StringValue = '5m';

  /* ── Upload ────────────────────────────────────────────────────────────── */

  @ToNumber()
  @IsInt()
  @Min(1)
  @Max(20)
  AVATAR_MAX_SIZE_MB = 2;

  /* ── Rate limiting ─────────────────────────────────────────────────────── */

  @IsDuration()
  THROTTLE_SHORT_TTL: StringValue = '1m';

  @ToNumber()
  @IsInt()
  @Min(1)
  THROTTLE_SHORT_LIMIT = 20;

  @IsDuration()
  THROTTLE_MEDIUM_TTL: StringValue = '5m';

  @ToNumber()
  @IsInt()
  @Min(1)
  THROTTLE_MEDIUM_LIMIT = 60;

  @IsDuration()
  THROTTLE_LONG_TTL: StringValue = '1h';

  @ToNumber()
  @IsInt()
  @Min(1)
  THROTTLE_LONG_LIMIT = 100;
}
