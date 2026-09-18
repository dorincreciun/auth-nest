import { registerAs } from '@nestjs/config';

import { getEnvironment } from './environment';

export const UPLOAD_CONFIG_NAMESPACE = 'upload';

const BYTES_PER_MEGABYTE = 1024 * 1024;

export const uploadConfig = registerAs(UPLOAD_CONFIG_NAMESPACE, () => {
  const env = getEnvironment();

  return {
    avatarFolder: 'avatars',
    avatarMaxSizeMb: env.AVATAR_MAX_SIZE_MB,
    avatarMaxSizeBytes: env.AVATAR_MAX_SIZE_MB * BYTES_PER_MEGABYTE,
    avatarMimeTypes: /^image\/(jpeg|png|webp|gif)$/,
  } as const;
});
