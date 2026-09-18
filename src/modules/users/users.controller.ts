import {
  Body,
  Controller,
  Delete,
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

import { Auth, CurrentUser } from '../../common/decorators';
import { ApiSuccessResponse, ErrorResponseDto } from '../../common/swagger';
import { MFile } from '../file';
import {
  UpdateUserAvatarPayloadDto,
  UpdateUserProfilePayloadDto,
  UserProfileDataDto,
  UserProfileDto,
} from './dto';
import { UserMapper } from './mappers';
import { AvatarValidationPipe } from './pipes';
import { UsersService } from './users.service';

@ApiTags('users')
@Auth()
@SkipThrottle({ medium: true, long: true })
@Throttle({ short: { limit: 10, ttl: 60 * 1000 } })
@Controller('users')
export class UsersController {
  public constructor(private readonly usersService: UsersService) {}

  /**
   * Încarcă avatarul utilizatorului autentificat.
   * Imaginea e convertită în WebP, urcată în storage, iar avatarul precedent e șters.
   */
  @HttpCode(HttpStatus.OK)
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateUserAvatarPayloadDto })
  @UseInterceptors(FileInterceptor('avatarFile'))
  @ApiOperation({
    summary: 'Încarcă avatarul utilizatorului autentificat',
    description:
      'Acceptă un fișier imagine (`avatarFile`) via `multipart/form-data`. ' +
      'Tipurile permise și dimensiunea maximă sunt configurabile prin variabile de mediu.',
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
  public async uploadAvatar(
    @UploadedFile(AvatarValidationPipe) file: MFile,
    @CurrentUser('id') userId: string,
  ): Promise<UserProfileDataDto> {
    const profile = await this.usersService.replaceAvatar(userId, file);

    return { profile: UserMapper.toProfileDto(profile) };
  }

  /** Șterge avatarul utilizatorului autentificat, atât din storage cât și din profil. */
  @HttpCode(HttpStatus.OK)
  @Delete('me/avatar')
  @ApiOperation({ summary: 'Șterge avatarul utilizatorului autentificat' })
  @ApiSuccessResponse(UserProfileDataDto, {
    status: 200,
    description: 'Avatar șters; profil actualizat',
    extraModels: [UserProfileDto],
  })
  @ApiResponse({ status: 400, description: 'Nu există avatar de șters', type: ErrorResponseDto })
  public async deleteAvatar(@CurrentUser('id') userId: string): Promise<UserProfileDataDto> {
    const profile = await this.usersService.removeAvatar(userId);

    return { profile: UserMapper.toProfileDto(profile) };
  }

  /**
   * Actualizează profilul utilizatorului autentificat.
   * Cel puțin un câmp trebuie trimis; avatarul se schimbă prin endpoint-ul de upload.
   */
  @HttpCode(HttpStatus.OK)
  @Patch('me/profile')
  @ApiOperation({
    summary: 'Actualizează profilul utilizatorului autentificat',
    description:
      'Actualizează câmpurile din `user_profiles` pentru userul din sesiune și ' +
      'returnează doar profilul public (`UserProfileDto`).',
  })
  @ApiSuccessResponse(UserProfileDataDto, {
    status: 200,
    description: 'Profil actualizat',
    extraModels: [UserProfileDto],
  })
  @ApiResponse({ status: 422, description: 'Date invalide / body gol', type: ErrorResponseDto })
  public async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() payload: UpdateUserProfilePayloadDto,
  ): Promise<UserProfileDataDto> {
    const profile = await this.usersService.updateProfile(userId, payload);

    return { profile: UserMapper.toProfileDto(profile) };
  }
}
