import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { FILE_UPLOAD } from './file.constants';
import { MFile } from './mfile.class';

/**
 * Helperi pentru validarea / normalizarea fișierelor încărcate (fără I/O pe disc).
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

  public convertToWebP(file: Buffer): Promise<Buffer> {
    return sharp(file).webp().toBuffer();
  }

  /**
   * Normalizează fișierele: imaginile raster → WebP; SVG rămâne neschimbat;
   * restul păstrează buffer-ul și primesc un nume unic.
   */
  public async filterFiles(files: MFile[]): Promise<MFile[]> {
    return Promise.all(
      files.map(async (file) => {
        const subtype = file.mimetype.split('/')[1] ?? 'bin';
        const stamp = Date.now();

        if (file.mimetype.startsWith('image/')) {
          if (subtype === 'svg+xml') {
            return new MFile({
              buffer: file.buffer,
              originalname: `${stamp}.svg`,
              mimetype: file.mimetype,
            });
          }

          const buffer = await this.convertToWebP(file.buffer);
          return new MFile({
            buffer,
            originalname: `${stamp}.webp`,
            mimetype: 'image/webp',
          });
        }

        const extension = this.extractExtension(file.originalname) ?? subtype.replace('+', '-');

        return new MFile({
          buffer: file.buffer,
          originalname: `${stamp}.${extension}`,
          mimetype: file.mimetype,
        });
      }),
    );
  }

  /**
   * Pregătește avatarul: validare + conversie WebP (dacă nu e deja WebP).
   */
  public async prepareAvatarFile(
    file: Express.Multer.File | undefined,
  ): Promise<Express.Multer.File> {
    const avatar = this.assertAvatarFile(file);

    if (avatar.mimetype === 'image/webp') {
      return avatar;
    }

    const buffer = await this.convertToWebP(avatar.buffer);

    return {
      ...avatar,
      buffer,
      size: buffer.length,
      mimetype: 'image/webp',
      originalname: `${Date.now()}.webp`,
    };
  }

  private extractExtension(filename: string): string | null {
    const match = /\.([^.]+)$/.exec(filename);
    return match?.[1]?.toLowerCase() ?? null;
  }
}
