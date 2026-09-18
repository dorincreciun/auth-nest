import { registerAs } from '@nestjs/config';

import { NodeEnvironment } from './environment-variables';
import { getEnvironment } from './environment';

export const APP_CONFIG_NAMESPACE = 'app';

export const appConfig = registerAs(APP_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    name: env.APP_NAME,
    host: env.APP_URL,
    port: env.APP_PORT,
    nodeEnv: env.NODE_ENV,
    globalPrefix: env.API_PREFIX,
    apiVersion: env.API_VERSION,
    corsOrigins: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    swaggerEnabled: env.SWAGGER_ENABLED || env.NODE_ENV === NodeEnvironment.Development,
  } as const;
});
