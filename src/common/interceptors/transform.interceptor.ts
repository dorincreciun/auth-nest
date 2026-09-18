import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';

import { SKIP_RESPONSE_TRANSFORM } from '../decorators/skip-response-transform.decorator';
import { SuccessResponse } from '../interfaces';

/**
 * Înfășoară orice răspuns de succes în envelope-ul uniform
 * `{ success, statusCode, meta, data }`, ca frontend-ul să aibă un singur contract.
 *
 * Handler-ele marcate cu `@SkipResponseTransform()` sunt lăsate neatinse.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T> | T> {
  public constructor(private readonly reflector: Reflector) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_TRANSFORM, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: T) => ({
        success: true as const,
        statusCode: response.statusCode,
        meta: {
          path: request.url,
          timestamp: new Date().toISOString(),
        },
        data,
      })),
    );
  }
}
