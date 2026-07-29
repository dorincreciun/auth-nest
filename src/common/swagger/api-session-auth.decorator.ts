import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';

/** Numele schemei OpenAPI pentru autentificarea pe cookie de sesiune */
export const SWAGGER_SESSION_AUTH = 'session';

/** Marchează endpoint-ul ca protejat de cookie-ul de sesiune (Swagger Authorize). */
export function ApiSessionAuth(): MethodDecorator & ClassDecorator {
  return applyDecorators(ApiCookieAuth(SWAGGER_SESSION_AUTH));
}
