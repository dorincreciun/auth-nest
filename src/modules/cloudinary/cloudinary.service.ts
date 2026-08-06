import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';
import { MFile } from '../file/mfile.class';

@Injectable()
export class CloudinaryService {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof v2) {}

  async uploadFile(file: MFile, folder: string): Promise<string> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            return reject(
              new InternalServerErrorException('Eroare la încărcarea fișierului pe Cloudinary'),
            );
          }
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });

    return result.secure_url;
  }

  async uploadFiles(files: MFile[], folder: string): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  /**
   * Șterge un fișier din Cloudinary după `public_id`.
   */
  public async deleteFile(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch {
      throw new InternalServerErrorException('Eroare la ștergerea fișierului de pe Cloudinary');
    }
  }

  /**
   * Șterge un fișier din Cloudinary pe baza URL-ului `secure_url`.
   * Dacă `public_id` nu poate fi extras, operația e ignorată.
   */
  public async deleteByUrl(fileUrl: string): Promise<void> {
    const publicId = this.extractPublicId(fileUrl);
    if (!publicId) {
      return;
    }

    await this.deleteFile(publicId);
  }

  /**
   * Extrage `public_id` din URL Cloudinary.
   * Ex: `.../upload/v123/avatars/171000.webp` → `avatars/171000`
   */
  private extractPublicId(fileUrl: string): string | null {
    const uploadMarker = '/upload/';
    const uploadIndex = fileUrl.indexOf(uploadMarker);
    if (uploadIndex === -1) {
      return null;
    }

    let path = fileUrl.slice(uploadIndex + uploadMarker.length);
    path = path.split('?')[0];
    path = path.replace(/^v\d+\//, '');
    path = path.replace(/\.[^.]+$/, '');

    return path || null;
  }
}
