export const FILE_UPLOAD = {
  AVATAR_FIELD: 'file',
  AVATAR_MAX_BYTES: 2 * 1024 * 1024, // 2 MB
  AVATAR_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  AVATAR_FOLDER_PREFIX: 'avatars',
} as const;

export type AvatarMimeType = (typeof FILE_UPLOAD.AVATAR_MIME_TYPES)[number];
