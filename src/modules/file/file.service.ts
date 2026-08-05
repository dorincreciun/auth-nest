import { BadRequestException, Injectable } from '@nestjs/common';
import { FILE_UPLOAD } from './file.constants';

/**
 * Helperi pentru validarea fișierelor încărcate (fără I/O pe disc).
 * Upload-ul efectiv e în CloudinaryService.
 */
@Injectable()
export class FileService {
  private static readonly MESSAGES = {
    FILE_REQUIRED: 'Fișierul de avatar este obligatoriu.',
  } as const;

  public assertAvatarFile(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file?.buffer?.length) {
      throw new BadRequestException(FileService.MESSAGES.FILE_REQUIRED);
    }
    return file;
  }

  public getAvatarFolder(userId: string): string {
    return `${FILE_UPLOAD.AVATAR_FOLDER_PREFIX}/${userId}`;
  }
}
