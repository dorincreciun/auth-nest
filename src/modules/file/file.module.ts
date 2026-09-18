import { Module } from '@nestjs/common';

import { CloudinaryModule } from '../cloudinary';
import { FileService } from './file.service';

/**
 * Procesarea și stocarea fișierelor. Modulul nu expune rute proprii: fișierele
 * intră întotdeauna prin endpoint-ul domeniului care le folosește (ex. avatarul
 * unui utilizator), ca fiecare upload să fie autorizat și validat în context.
 */
@Module({
  imports: [CloudinaryModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
