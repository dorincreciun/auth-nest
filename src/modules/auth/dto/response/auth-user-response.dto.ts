import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../users';

/**
 * Payload din `data` pentru register / login / me.
 * Controller returnează: { user }
 */
export class AuthUserResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
