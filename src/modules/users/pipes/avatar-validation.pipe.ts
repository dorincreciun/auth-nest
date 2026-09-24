import { BadRequestException, Inject, Injectable, PipeTransform } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { uploadConfig } from '../../../config';
import { MFile } from '../../file';

/**
 * Validează fișierul de avatar și îl normalizează în `MFile`.
 *
 * Regulile (dimensiune, tipuri permise) vin din configurație, nu din decoratori,
 * ca să poată fi ajustate prin variabile de mediu fără modificări de cod.
 */
@Injectable()
export class AvatarValidationPipe implements PipeTransform<Express.Multer.File | undefined, MFile> {
  private static readonly MESSAGES = {
    MISSING: 'Send an image file in the "avatarFile" field',
    UNSUPPORTED_TYPE: 'Only JPEG, PNG, WebP, or GIF images are accepted',
  } as const;

  public constructor(
    @Inject(uploadConfig.KEY) private readonly uploads: ConfigType<typeof uploadConfig>,
  ) {}

  public transform(file?: Express.Multer.File): MFile {
    if (!file) {
      throw new BadRequestException(AvatarValidationPipe.MESSAGES.MISSING);
    }

    if (!this.uploads.avatarMimeTypes.test(file.mimetype)) {
      throw new BadRequestException(AvatarValidationPipe.MESSAGES.UNSUPPORTED_TYPE);
    }

    if (file.size > this.uploads.avatarMaxSizeBytes) {
      throw new BadRequestException(`The avatar cannot exceed ${this.uploads.avatarMaxSizeMb} MB`);
    }

    return new MFile(file);
  }
}
