import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessEnvelopeDto } from '../../../../common/dto';
import { MessageResponseDto } from './message-response.dto';

/**
 * Răspuns HTTP documentat în Swagger pentru logout / confirm / reset.
 * Reflectă envelope-ul TransformInterceptor + data: { message }.
 */
export class MessageApiResponseDto extends ApiSuccessEnvelopeDto {
  @ApiProperty({ type: MessageResponseDto })
  data: MessageResponseDto;
}
