import { registerAs } from '@nestjs/config';

import { getEnvironment } from './environment';

export const MAIL_CONFIG_NAMESPACE = 'mail';

export const mailConfig = registerAs(MAIL_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    user: env.MAIL_USER,
    password: env.MAIL_PASSWORD,
    from: env.MAIL_FROM,
  } as const;
});
