import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessEnvelopeDto } from '../../../../common/dto';
import { AuthUserResponseDto } from './auth-user-response.dto';

/**
 * Răspuns HTTP documentat în Swagger pentru register / login / me.
 * Reflectă envelope-ul TransformInterceptor + data: { user }.
 */
export class AuthUserApiResponseDto extends ApiSuccessEnvelopeDto {
  @ApiProperty({ type: AuthUserResponseDto })
  data: AuthUserResponseDto;
}
