import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
import { CloudinaryService } from '../cloudinary';
import { Auth } from '../auth/decorators';
import { createAvatarMulterOptions, FILE_UPLOAD, FileService } from '../file';
import { UpdateUserProfilePayloadDto, UserProfileDataDto, UserProfileDto } from './dto';
import { UserMapper } from './mappers';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  public constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly fileService: FileService,
  ) {}

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
  @ApiResponse({
    status: 422,
    description: 'Date invalide / body gol',
    type: ErrorResponseDto,
  })
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

  /**
   * Încarcă un avatar pe Cloudinary și actualizează `avatarUrl` pe profil.
   * Șterge (best-effort) avatarul Cloudinary anterior, dacă există.
   */
  @Auth()
  @ApiSessionAuth()
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 5, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor(FILE_UPLOAD.AVATAR_FIELD, createAvatarMulterOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [FILE_UPLOAD.AVATAR_FIELD],
      properties: {
        [FILE_UPLOAD.AVATAR_FIELD]: {
          type: 'string',
          format: 'binary',
          description: 'Imagine avatar (JPEG/PNG/WebP, max 2MB)',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Încarcă avatarul utilizatorului autentificat',
    description:
      'Primește un fișier multipart (`file`), îl urcă pe Cloudinary (crop 512×512) ' +
      'și salvează `secure_url` în profil. Avatarul vechi este șters dacă e pe Cloudinary.',
  })
  @ApiSuccessResponse(UserProfileDataDto, {
    status: 200,
    description: 'Avatar actualizat',
    extraModels: [UserProfileDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Fișier lipsă / tip invalid',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserProfileDataDto> {
    const avatarFile = await this.fileService.prepareAvatarFile(file);
    const existingProfile = await this.usersService.getProfile(userId);
    const previousPublicId = this.cloudinaryService.extractPublicId(existingProfile?.avatarUrl);

    const uploaded = await this.cloudinaryService.uploadImage(
      avatarFile,
      this.fileService.getAvatarFolder(userId),
    );

    const profile = await this.usersService.updateProfile(userId, {
      avatarUrl: uploaded.url,
    });

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      await this.cloudinaryService.deleteImage(previousPublicId);
    }

    return {
      profile: UserMapper.toProfileDto(profile),
    };
  }
}
