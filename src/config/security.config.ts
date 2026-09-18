import { registerAs } from '@nestjs/config';

import { getEnvironment } from './environment';

export const SECURITY_CONFIG_NAMESPACE = 'security';

export const securityConfig = registerAs(SECURITY_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    bcryptSaltRounds: env.BCRYPT_SALT,
    cookieSecret: env.COOKIE_SECRET,
  } as const;
});
