import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from '../user-profile.dto';

/**
 * Conținutul `data` pentru PATCH /users/me/profile.
 * Shape: `{ profile: UserProfileDto }`
 */
@ApiExtraModels(UserProfileDto)
export class UserProfileDataDto {
  @ApiProperty({
    type: UserProfileDto,
    description: 'Profilul public actualizat',
  })
  profile: UserProfileDto;
}
