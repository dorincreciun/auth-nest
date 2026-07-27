import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessEnvelopeDto } from '../../../../common/dto';
import { TokenSentResponseDto } from './token-sent-response.dto';

/**
 * Răspuns HTTP documentat în Swagger pentru verify/send și password/forgot.
 * Reflectă envelope-ul TransformInterceptor + data: { message, tokenExpiresAt }.
 */
export class TokenSentApiResponseDto extends ApiSuccessEnvelopeDto {
  @ApiProperty({ type: TokenSentResponseDto })
  data: TokenSentResponseDto;
}
