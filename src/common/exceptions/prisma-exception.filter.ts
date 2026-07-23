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
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleKnownRequestError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['Datele trimise nu respectă schema așteptată.'],
        error: 'VALIDATION_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: ['Serviciul de bază de date este momentan indisponibil.'],
        error: exception.errorCode ?? 'INIT_ERROR',
      };
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: ['A apărut o eroare internă critică. Reîncearcă mai târziu.'],
        error: 'RUST_PANIC',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ['A apărut o eroare neașteptată la nivel de bază de date.'],
      error: 'UNKNOWN_REQUEST_ERROR',
    };
  }

  private handleKnownRequestError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string[];
    error: string;
  } {
    const target = exception.meta?.target as string[] | string | undefined;
    const fieldName = Array.isArray(target) ? target.join(', ') : target;

    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: [
            fieldName
              ? `Valoarea pentru câmpul "${fieldName}" există deja.`
              : 'Această valoare există deja în sistem.',
          ],
          error: exception.code,
        };

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: ['Resursa cerută nu a fost găsită.'],
          error: exception.code,
        };

      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [`Relația către "${fieldName ?? 'o altă resursă'}" nu este validă.`],
          error: exception.code,
        };

      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['Această operație ar încălca o relație obligatorie.'],
          error: exception.code,
        };

      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [`Valoarea trimisă pentru "${fieldName ?? 'un câmp'}" este prea lungă.`],
          error: exception.code,
        };

      case 'P2020':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['O valoare trimisă este în afara intervalului acceptat.'],
          error: exception.code,
        };

      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: [`Câmpul "${fieldName ?? 'necunoscut'}" nu poate fi gol.`],
          error: exception.code,
        };

      case 'P2010':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['Query-ul nu a putut fi executat corect.'],
          error: exception.code,
        };

      case 'P2024':
        return {
          statusCode: HttpStatus.GATEWAY_TIMEOUT,
          message: ['Baza de date a răspuns prea greu. Încearcă din nou.'],
          error: exception.code,
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: ['A apărut o eroare la procesarea cererii în baza de date.'],
          error: exception.code,
        };
    }
  }
}
