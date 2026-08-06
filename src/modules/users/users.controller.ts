import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators';
import { ApiSessionAuth, ApiSuccessResponse, ErrorResponseDto } from '../../common/swagger';
import { Auth } from '../auth/decorators';
import { FileService, MFile } from '../file';
import {
  UpdateUserAvatarPayloadDto,
  UpdateUserProfilePayloadDto,
  UserProfileDataDto,
  UserProfileDto,
} from './dto';
import { UserMapper } from './mappers';
import { UsersService } from './users.service';

/** Dimensiunea maximă a avatarului: 2 MB */
const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;

/** Folder Cloudinary pentru avatare */
const AVATAR_FOLDER = 'avatars';

@ApiTags('users')
@Controller('users')
export class UsersController {
  public constructor(
    private readonly usersService: UsersService,
    private readonly fileService: FileService,
  ) {}

  /**
   * Încarcă avatarul utilizatorului autentificat.
   * Imaginea e convertită (unde e cazul) și urcată pe Cloudinary în folderul `avatars`,
   * apoi URL-ul e salvat pe profil.
   */
  @Auth()
  @ApiSessionAuth()
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } }) // 10 / minut
  @HttpCode(HttpStatus.OK)
  @Post('upload/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateUserAvatarPayloadDto })
  @UseInterceptors(
    FileInterceptor('avatarFile', {
      limits: { fileSize: AVATAR_MAX_SIZE_BYTES },
    }),
  )
  @ApiOperation({
    summary: 'Încarcă avatarul utilizatorului autentificat',
    description:
      'Acceptă un fișier imagine (`avatarFile`) via `multipart/form-data`. ' +
      'Tipuri permise: JPEG, PNG, WebP, GIF. Dimensiune maximă: 2 MB. ' +
      'Returnează profilul public actualizat (`UserProfileDto`).',
  })
  @ApiSuccessResponse(UserProfileDataDto, {
    status: 200,
    description: 'Avatar încărcat; profil actualizat',
    extraModels: [UserProfileDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Fișier lipsă / invalid / prea mare',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: AVATAR_MAX_SIZE_BYTES,
            message: `Avatarul nu poate depăși ${AVATAR_MAX_SIZE_BYTES / (1024 * 1024)} MB`,
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp|gif)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ): Promise<UserProfileDataDto> {
    const mFile = new MFile(file);
    const [url] = await this.fileService.saveFiles([mFile], AVATAR_FOLDER);

    const profile = await this.usersService.updateAvatar(userId, url);

    return {
      profile: UserMapper.toProfileDto(profile),
    };
  }

  /**
   * Șterge avatarul utilizatorului autentificat.
   * Elimină fișierul de pe Cloudinary și setează `avatarUrl` la `null` pe profil.
   */
  @Auth()
  @ApiSessionAuth()
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } }) // 10 / minut
  @HttpCode(HttpStatus.OK)
  @Delete('me/avatar')
  @ApiOperation({
    summary: 'Șterge avatarul utilizatorului autentificat',
    description:
      'Șterge imaginea de pe Cloudinary și golește `avatarUrl` din profil. ' +
      'Returnează profilul public actualizat (`UserProfileDto`).',
  })
  @ApiSuccessResponse(UserProfileDataDto, {
    status: 200,
    description: 'Avatar șters; profil actualizat',
    extraModels: [UserProfileDto],
  })
  @ApiResponse({ status: 400, description: 'Nu există avatar de șters', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async deleteAvatar(@CurrentUser('id') userId: string): Promise<UserProfileDataDto> {
    const currentProfile = await this.usersService.getProfile(userId);

    if (!currentProfile?.avatarUrl) {
      throw new BadRequestException('Nu există un avatar de șters');
    }

    await this.fileService.deleteFile(currentProfile.avatarUrl);
    const profile = await this.usersService.deleteAvatar(userId);

    return {
      profile: UserMapper.toProfileDto(profile),
    };
  }

  /**
   * Actualizează profilul utilizatorului autentificat.
   * Cel puțin un câmp din body trebuie trimis.
   * Avatarul se actualizează separat (upload), nu prin acest endpoint.
   */
  @Auth()
  @ApiSessionAuth()
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Patch('me/profile')
  @ApiOperation({
    summary: 'Actualizează profilul utilizatorului autentificat',
    description:
      'Actualizează câmpurile din `user_profiles` pentru userul din sesiune. ' +
      'Returnează doar profilul public (`UserProfileDto`), fără id/userId interne. ' +
      'Avatarul se schimbă printr-un endpoint separat de upload.',
  })
  @ApiSuccessResponse(UserProfileDataDto, {
    status: 200,
    description: 'Profil actualizat',
    extraModels: [UserProfileDto],
  })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide / body gol', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserProfilePayloadDto,
  ): Promise<UserProfileDataDto> {
    const profile = await this.usersService.updateProfile(userId, dto);

    return {
      profile: UserMapper.toProfileDto(profile),
    };
  }
}
