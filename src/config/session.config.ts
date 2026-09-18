import { registerAs } from '@nestjs/config';

import { toMilliseconds, toSeconds } from '../common/utils';
import { getEnvironment } from './environment';

export const SESSION_CONFIG_NAMESPACE = 'session';

export const sessionConfig = registerAs(SESSION_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    secret: env.SESSION_SECRET,
    cookieName: env.SESSION_NAME,
    cookieDomain: env.SESSION_DOMAIN,
    /** Prefixul cheilor din Redis gestionate de `connect-redis`. */
    keyPrefix: env.SESSION_FOLDER,
    maxAgeMs: toMilliseconds(env.SESSION_MAX_AGE),
    maxAgeSeconds: toSeconds(env.SESSION_MAX_AGE),
    secure: env.SESSION_SECURE,
    sameSite: env.SESSION_SAME_SITE,
  } as const;
});
