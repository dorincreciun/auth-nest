import { BadRequestException } from '@nestjs/common';
import { memoryStorage, type Options } from 'multer';
import { FILE_UPLOAD } from './file.constants';

/**
 * Opțiuni Multer pentru upload avatar (memory storage + validare tip/mărime).
 */
export function createAvatarMulterOptions(): Options {
  const allowed = new Set<string>(FILE_UPLOAD.AVATAR_MIME_TYPES);

  return {
    storage: memoryStorage(),
    limits: { fileSize: FILE_UPLOAD.AVATAR_MAX_BYTES },
    fileFilter: (_req, file, callback) => {
      if (!allowed.has(file.mimetype)) {
        callback(new BadRequestException('Doar imagini JPEG, PNG sau WebP sunt acceptate.'));
        return;
      }
      callback(null, true);
    },
  };
}
