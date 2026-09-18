import { registerAs } from '@nestjs/config';

import { toMilliseconds } from '../common/utils';
import { getEnvironment } from './environment';

export const REDIS_CONFIG_NAMESPACE = 'redis';

export const redisConfig = registerAs(REDIS_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    username: env.REDIS_USER,
    password: env.REDIS_PASSWORD,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    tls: env.REDIS_TLS,
    connectTimeoutMs: toMilliseconds(env.REDIS_CONNECT_TIMEOUT),
  } as const;
});
