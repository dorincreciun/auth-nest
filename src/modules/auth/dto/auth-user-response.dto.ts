import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users';

export class AuthUserResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
