import { registerAs } from '@nestjs/config';

import { getEnvironment } from './environment';

export const DATABASE_CONFIG_NAMESPACE = 'database';

export const databaseConfig = registerAs(DATABASE_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    url: env.DATABASE_URL,
  } as const;
});
