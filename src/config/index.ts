import { appConfig } from './app.config';
import { cloudinaryConfig } from './cloudinary.config';
import { databaseConfig } from './database.config';
import { mailConfig } from './mail.config';
import { redisConfig } from './redis.config';
import { securityConfig } from './security.config';
import { sessionConfig } from './session.config';
import { throttleConfig } from './throttle.config';
import { tokenConfig } from './token.config';
import { uploadConfig } from './upload.config';

export * from './app.config';
export * from './cloudinary.config';
export * from './database.config';
export * from './environment';
export * from './environment-variables';
export * from './mail.config';
export * from './redis.config';
export * from './security.config';
export * from './session.config';
export * from './throttle.config';
export * from './token.config';
export * from './upload.config';

/** Toate namespace-urile de configurare, înregistrate de `AppModule`. */
export const configurations = [
  appConfig,
  cloudinaryConfig,
  databaseConfig,
  mailConfig,
  redisConfig,
  securityConfig,
  sessionConfig,
  throttleConfig,
  tokenConfig,
  uploadConfig,
] as const;
