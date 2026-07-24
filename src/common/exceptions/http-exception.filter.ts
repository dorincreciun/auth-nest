import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorResponse } from '../interfaces';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private static readonly MESSAGES = {
    INTERNAL_SERVER_ERROR: 'Internal server error',
    ERROR_LABEL: 'Internal Server Error',
  } as const;

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.resolveStatus(exception);
    const exceptionResponse = this.resolveExceptionResponse(exception);

    const responseBody: ErrorResponse = {
      success: false,
      statusCode: status,
      message: this.extractMessage(exception, exceptionResponse),
      timestamp: new Date().toISOString(),
      path: request.url,
      error: this.extractError(exceptionResponse),
    };

    response.status(status).json(responseBody);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveExceptionResponse(exception: unknown): string | object | null {
    return exception instanceof HttpException ? exception.getResponse() : null;
  }

  private extractMessage(exception: unknown, exceptionResponse: string | object | null): string[] {
    if (typeof exceptionResponse === 'string') {
      return [exceptionResponse];
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const msg = (exceptionResponse as Record<string, unknown>).message;
      return Array.isArray(msg) ? msg.map(String) : [String(msg)];
    }

    if (exception instanceof Error) {
      return [exception.message];
    }

    return [HttpExceptionFilter.MESSAGES.INTERNAL_SERVER_ERROR];
  }

  private extractError(exceptionResponse: string | object | null): string {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'error' in exceptionResponse
    ) {
      return String((exceptionResponse as Record<string, unknown>).error);
    }
    return HttpExceptionFilter.MESSAGES.ERROR_LABEL;
  }
}
