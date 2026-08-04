import { Body, Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators';
import { ApiSessionAuth, ApiSuccessResponse, ErrorResponseDto } from '../../common/swagger';
import { Auth } from '../auth/decorators';
import { UpdateUserProfilePayloadDto, UserProfileDataDto, UserProfileDto } from './dto';
import { UserMapper } from './mappers';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  public constructor(private readonly usersService: UsersService) {}

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
