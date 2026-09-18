import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { AuthGuard } from '../../common/guards';
import { uploadConfig } from '../../config';
import { FileModule } from '../file';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    FileModule,
    /** Limita de dimensiune e aplicată de multer înainte ca fișierul să ajungă în memorie. */
    MulterModule.registerAsync({
      inject: [uploadConfig.KEY],
      useFactory: (uploads: ConfigType<typeof uploadConfig>) => ({
        limits: { fileSize: uploads.avatarMaxSizeBytes },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, AuthGuard],
  exports: [UsersService, AuthGuard],
})
export class UsersModule {}
