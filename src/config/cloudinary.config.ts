import { registerAs } from '@nestjs/config';

import { getEnvironment } from './environment';

export const CLOUDINARY_CONFIG_NAMESPACE = 'cloudinary';

export const cloudinaryConfig = registerAs(CLOUDINARY_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  } as const;
});
