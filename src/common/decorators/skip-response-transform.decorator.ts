import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_TRANSFORM = 'skipResponseTransform';

/**
 * Scoate handler-ul din envelope-ul standard `{ success, statusCode, meta, data }`.
 *
 * Necesar acolo unde forma răspunsului e impusă din afară — health check-uri
 * citite de orchestratoare, webhook-uri, integrări cu terți.
 */
export function SkipResponseTransform(): MethodDecorator & ClassDecorator {
  return SetMetadata(SKIP_RESPONSE_TRANSFORM, true);
}
