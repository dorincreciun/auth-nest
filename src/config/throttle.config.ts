import { registerAs } from '@nestjs/config';

import { toMilliseconds } from '../common/utils';
import { getEnvironment } from './environment';

export const THROTTLE_CONFIG_NAMESPACE = 'throttle';

/**
 * Trei praguri globale de rate limiting, pe care endpoint-urile sensibile le
 * restrâng suplimentar prin `@Throttle`:
 * - `short`  — anti-burst (ex. login)
 * - `medium` — fereastră scurtă (ex. confirmare OTP)
 * - `long`   — anti-spam pe oră (ex. register / forgot password)
 */
export const throttleConfig = registerAs(THROTTLE_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    short: { ttlMs: toMilliseconds(env.THROTTLE_SHORT_TTL), limit: env.THROTTLE_SHORT_LIMIT },
    medium: { ttlMs: toMilliseconds(env.THROTTLE_MEDIUM_TTL), limit: env.THROTTLE_MEDIUM_LIMIT },
    long: { ttlMs: toMilliseconds(env.THROTTLE_LONG_TTL), limit: env.THROTTLE_LONG_LIMIT },
  } as const;
});
