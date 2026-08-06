import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MFile } from './mfile.class';

@Injectable()
export class FileService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  private async convertToWebP(file: Buffer): Promise<Buffer> {
    return sharp(file).webp().toBuffer();
  }

  public async filterFiles(files: MFile[]): Promise<MFile[]> {
    const newFiles = await Promise.all(
      files.map(async (file) => {
        const { mimetype, originalname } = file;
        const currentFileType = mimetype.split('/')[1];
        const originalExtension = originalname.split('.').pop();
        const baseName = Date.now();

        const isImage = mimetype.includes('image');
        const isSvg = currentFileType === 'svg+xml';

        if (isImage && !isSvg) {
          const buffer = await this.convertToWebP(file.buffer);
          return new MFile({
            buffer,
            originalname: `${baseName}.webp`,
            mimetype: 'image/webp',
          });
        }

        if (isImage && isSvg) {
          return new MFile({
            buffer: file.buffer,
            originalname: `${baseName}.svg`,
            mimetype,
          });
        }

        return new MFile({
          buffer: file.buffer,
          originalname: `${baseName}.${originalExtension}`,
          mimetype,
        });
      }),
    );

    return newFiles;
  }

  public async saveFiles(files: MFile[], folder: string): Promise<string[]> {
    const filteredFiles = await this.filterFiles(files);
    return this.cloudinaryService.uploadFiles(filteredFiles, folder);
  }

  public async deleteFile(fileUrl: string): Promise<void> {
    await this.cloudinaryService.deleteByUrl(fileUrl);
  }
}
