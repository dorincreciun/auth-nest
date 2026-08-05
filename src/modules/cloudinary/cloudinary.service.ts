import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 as Cloudinary } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.constants';

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  private static readonly MESSAGES = {
    UPLOAD_FAILED: 'Nu s-a putut încărca imaginea. Încearcă din nou.',
    INVALID_FILE: 'Fișierul încărcat nu este valid.',
  } as const;

  private readonly logger = new Logger(CloudinaryService.name);

  public constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof Cloudinary) {}

  /**
   * Încarcă o imagine din buffer (Multer memory storage).
   * Aplică crop 512×512 (face) — potrivit pentru avatar.
   */
  public async uploadImage(
    file: Express.Multer.File,
    folder = 'avatars',
  ): Promise<CloudinaryUploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(CloudinaryService.MESSAGES.INVALID_FILE);
    }

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const stream = this.cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            overwrite: true,
            transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
          },
          (error: UploadApiErrorResponse | undefined, response: UploadApiResponse | undefined) => {
            if (error || !response) {
              reject(
                error instanceof Error
                  ? error
                  : new Error(
                      typeof error === 'object' && error?.message
                        ? String(error.message)
                        : 'Empty Cloudinary response',
                    ),
              );
              return;
            }
            resolve(response);
          },
        );

        stream.end(file.buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      this.logger.error('Cloudinary upload failed', error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException(CloudinaryService.MESSAGES.UPLOAD_FAILED);
    }
  }

  /**
   * Șterge o imagine după `public_id`. Nu aruncă dacă resursa lipsește.
   */
  public async deleteImage(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    } catch (error) {
      this.logger.warn(
        `Cloudinary delete failed for ${publicId}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Extrage `public_id` dintr-un URL Cloudinary `secure_url`.
   * Returnează `null` dacă URL-ul nu e Cloudinary sau nu poate fi parsat.
   */
  public extractPublicId(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }

    try {
      const pathname = new URL(url).pathname;
      const uploadMarker = '/upload/';
      const uploadIndex = pathname.indexOf(uploadMarker);

      if (uploadIndex === -1) {
        return null;
      }

      let pathAfterUpload = pathname.slice(uploadIndex + uploadMarker.length);
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
      return pathAfterUpload.replace(/\.[^/.]+$/, '') || null;
    } catch {
      return null;
    }
  }
}
