import { registerAs } from '@nestjs/config';

import { NodeEnvironment } from './environment-variables';
import { getEnvironment } from './environment';

export const APP_CONFIG_NAMESPACE = 'app';

const LOOPBACK_LISTEN_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Render / Docker nu pot rute către loopback-ul containerului.
 * `localhost` se rezolvă pe IPv6 ca `::1`, ceea ce lasă `0.0.0.0` închis.
 */
export function resolveListenHost(host: string): string {
  return LOOPBACK_LISTEN_HOSTS.has(host.trim().toLowerCase()) ? '0.0.0.0' : host;
}

export const appConfig = registerAs(APP_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    name: env.APP_NAME,
    host: resolveListenHost(env.APP_HOST),
    port: env.APP_PORT,
    nodeEnv: env.NODE_ENV,
    globalPrefix: env.API_PREFIX,
    apiVersion: env.API_VERSION,
    corsOrigins: env.CORS_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    swaggerEnabled: env.SWAGGER_ENABLED || env.NODE_ENV === NodeEnvironment.Development,
  } as const;
});
