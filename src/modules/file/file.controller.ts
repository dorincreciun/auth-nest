import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { MFile } from './mfile.class';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body('folder') folder: string) {
    if (!file) {
      throw new BadRequestException('Niciun fișier nu a fost trimis');
    }

    if (!folder) {
      throw new BadRequestException('Câmpul "folder" este obligatoriu');
    }

    const mFile = new MFile(file);
    const [url] = await this.fileService.saveFiles([mFile], folder);

    return { url };
  }
}
