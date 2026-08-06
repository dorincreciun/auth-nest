import { ApiProperty } from '@nestjs/swagger';

/**
 * Body multipart pentru POST /users/upload/avatar.
 * Folderul Cloudinary (`avatars`) e setat pe server, nu se trimite din client.
 * Folosit doar pentru documentația OpenAPI (fișierul vine prin `@UploadedFile`).
 *
 * În OpenAPI, fișierele binare se documentează ca `string` + `format: binary`;
 * tipul TypeScript pentru client/codegen e `Blob`.
 */
export class UpdateUserAvatarPayloadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Fișier imagine (JPEG, PNG, WebP sau GIF), maxim 2 MB',
  })
  avatarFile!: Blob;
}
