import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { UserDto, UserProfileDto } from '../../../users';

/**
 * Conținutul `data` pentru register / login / me.
 *
 * Shape: `{ user: UserDto }`
 * - `GET /auth/me` → `user.profile` populat
 * - `register` / `login` → `user.profile` este `null`
 */
@ApiExtraModels(UserDto, UserProfileDto)
export class AuthUserDataDto {
  @ApiProperty({
    type: UserDto,
    description:
      'Utilizatorul public. Pe /auth/me include profile; pe register/login profile este null.',
  })
  user: UserDto;
}
