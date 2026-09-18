import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { AuthGuard } from '../guards/auth.guard';
import { ApiSessionAuth } from '../swagger/api-session-auth.decorator';
import { ErrorResponseDto } from '../swagger/error-response.dto';

/**
 * Marchează un endpoint ca disponibil doar cu sesiune validă.
 * Include și documentația OpenAPI (schema de cookie + răspunsul 401),
 * ca protecția și contractul public să nu poată ajunge desincronizate.
 */
export function Auth(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AuthGuard),
    ApiSessionAuth(),
    ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto }),
  );
}
