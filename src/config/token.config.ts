import { registerAs } from '@nestjs/config';

import { getEnvironment } from './environment';

export const TOKEN_CONFIG_NAMESPACE = 'token';

/** Politica pentru codurile OTP folosite la resetarea parolei. */
export const tokenConfig = registerAs(TOKEN_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    secret: env.TOKEN_SECRET ?? env.SESSION_SECRET,
    length: env.TOKEN_LENGTH,
    maxAttempts: env.TOKEN_MAX_ATTEMPTS,
    passwordResetTtl: env.PASSWORD_RESET_TOKEN_TTL,
  } as const;
});
