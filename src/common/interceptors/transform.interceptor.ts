import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../interfaces';

/**
 * Înfășoară orice răspuns de succes în envelope-ul `SuccessResponse`:
 * `{ success: true, statusCode, data }`.
 *
 * Metadatele de debug (`meta.path`, `meta.timestamp`) sunt incluse și în succes.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
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
