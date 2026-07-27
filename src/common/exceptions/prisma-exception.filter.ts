import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ErrorResponse } from '../interfaces';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private static readonly MESSAGES = {
    VALIDATION_ERROR: 'Datele trimise nu respectă schema așteptată.',
    DB_UNAVAILABLE: 'Serviciul de bază de date este momentan indisponibil.',
    RUST_PANIC: 'A apărut o eroare internă critică. Reîncearcă mai târziu.',
    UNKNOWN_REQUEST_ERROR: 'A apărut o eroare neașteptată la nivel de bază de date.',
    P2002:
      'Nu s-a putut finaliza operația. Verifică datele sau autentifică-te dacă ai deja un cont.',
    P2025: 'Resursa cerută nu a fost găsită.',
    P2003: (field?: string) => `Relația către "${field ?? 'o altă resursă'}" nu este validă.`,
    P2014: 'Această operație ar încălca o relație obligatorie.',
    P2000: (field?: string) => `Valoarea trimisă pentru "${field ?? 'un câmp'}" este prea lungă.`,
    P2020: 'O valoare trimisă este în afara intervalului acceptat.',
    P2011: (field?: string) => `Câmpul "${field ?? 'necunoscut'}" nu poate fi gol.`,
    P2010: 'Query-ul nu a putut fi executat corect.',
    P2024: 'Baza de date a răspuns prea greu. Încearcă din nou.',
    DEFAULT: 'A apărut o eroare la procesarea cererii în baza de date.',
  } as const;

  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientRustPanicError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.mapException(exception);

    this.logger.error(
      `[${request.method}] ${request.url} -> ${message.join(', ')}`,
      exception.stack,
    );

    const body: ErrorResponse = {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error,
    };

    response.status(statusCode).json(body);
  }

  private mapException(exception: unknown): {
    statusCode: number;
    message: string[];
    error: string;
  } {
    const { MESSAGES } = PrismaExceptionFilter;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleKnownRequestError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: [MESSAGES.VALIDATION_ERROR],
        error: 'VALIDATION_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: [MESSAGES.DB_UNAVAILABLE],
        error: exception.errorCode ?? 'INIT_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: [MESSAGES.RUST_PANIC],
        error: 'RUST_PANIC',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: [MESSAGES.UNKNOWN_REQUEST_ERROR],
      error: 'UNKNOWN_REQUEST_ERROR',
    };
  }

  private handleKnownRequestError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string[];
    error: string;
  } {
    const { MESSAGES } = PrismaExceptionFilter;
    const target = exception.meta?.target as string[] | string | undefined;
    const fieldName = Array.isArray(target) ? target.join(', ') : target;

    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: [MESSAGES.P2002],
          error: exception.code,
        };

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: [MESSAGES.P2025],
          error: exception.code,
        };

      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [MESSAGES.P2003(fieldName)],
          error: exception.code,
        };

      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [MESSAGES.P2014],
          error: exception.code,
        };

      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [MESSAGES.P2000(fieldName)],
          error: exception.code,
        };

      case 'P2020':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [MESSAGES.P2020],
          error: exception.code,
        };

      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [MESSAGES.P2011(fieldName)],
          error: exception.code,
        };

      case 'P2010':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [MESSAGES.P2010],
          error: exception.code,
        };

      case 'P2024':
        return {
          statusCode: HttpStatus.GATEWAY_TIMEOUT,
          message: [MESSAGES.P2024],
          error: exception.code,
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: [MESSAGES.DEFAULT],
          error: exception.code,
        };
    }
  }
}
