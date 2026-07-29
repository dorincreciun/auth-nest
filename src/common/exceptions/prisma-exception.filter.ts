import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import type { ErrorDetails, ErrorResponse } from '../interfaces';

/**
 * Excepțiile Prisma tratate de acest filtru.
 */
type PrismaException =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientValidationError
  | Prisma.PrismaClientInitializationError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientRustPanicError;

/**
 * Rezultatul intermediar al maparii unei excepții Prisma, înainte de a fi
 * asamblat în `ErrorResponse`.
 */
interface MappedPrismaError {
  statusCode: number;
  message: string;
  details: ErrorDetails;
}

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

  catch(exception: PrismaException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, details } = this.mapException(exception);

    this.logger.error(`[${request.method}] ${request.url} -> ${message}`, exception.stack);

    const body: ErrorResponse = {
      success: false,
      statusCode,
      message,
      details,
      meta: {
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(statusCode).json(body);
  }

  /**
   * Rutează excepția Prisma către handler-ul potrivit, în funcție de tipul
   * ei concret (`instanceof`), și întoarce o formă intermediară comună
   * (`MappedPrismaError`) pentru asamblarea răspunsului final.
   *
   * @param exception - Excepția Prisma prinsă de filtru.
   * @returns Codul de status, mesajul și detaliile corespunzătoare erorii.
   */
  private mapException(exception: PrismaException): MappedPrismaError {
    const { MESSAGES } = PrismaExceptionFilter;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleKnownRequestError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: MESSAGES.VALIDATION_ERROR,
        details: null,
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: MESSAGES.DB_UNAVAILABLE,
        details: null,
      };
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MESSAGES.RUST_PANIC,
        details: null,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: MESSAGES.UNKNOWN_REQUEST_ERROR,
      details: null,
    };
  }

  /**
   * Tratează specific `PrismaClientKnownRequestError`, mapând fiecare cod
   * de eroare Prisma (`P2002`, `P2025` etc.) la un status HTTP și un mesaj
   * localizat. Pentru erorile legate de un câmp anume (`P2002`, `P2003`,
   * `P2000`, `P2011`), numele câmpului e extras din `exception.meta.target`
   * și inclus atât în mesaj, cât și în `details`.
   *
   * @param exception - Eroarea Prisma cu cod cunoscut (`PrismaClientKnownRequestError`).
   * @returns Codul de status, mesajul și detaliile corespunzătoare codului de eroare.
   */
  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): MappedPrismaError {
    const { MESSAGES } = PrismaExceptionFilter;
    const fieldName = this.extractFieldName(exception.meta?.target);
    const fieldDetails = this.buildFieldDetails(fieldName, exception.code);

    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: MESSAGES.P2002,
          details: fieldDetails,
        };

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: MESSAGES.P2025,
          details: null,
        };

      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.P2003(fieldName),
          details: fieldDetails,
        };

      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.P2014,
          details: null,
        };

      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.P2000(fieldName),
          details: fieldDetails,
        };

      case 'P2020':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.P2020,
          details: null,
        };

      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.P2011(fieldName),
          details: fieldDetails,
        };

      case 'P2010':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: MESSAGES.P2010,
          details: null,
        };

      case 'P2024':
        return {
          statusCode: HttpStatus.GATEWAY_TIMEOUT,
          message: MESSAGES.P2024,
          details: null,
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: MESSAGES.DEFAULT,
          details: null,
        };
    }
  }

  /**
   * Extrage numele câmpului (sau câmpurilor) implicat într-o eroare Prisma
   * din `exception.meta.target`, care poate fi fie `string`, fie `string[]`
   * (ex: la constrângeri unice compuse din mai multe coloane).
   *
   * @param target - Valoarea `meta.target` din excepția Prisma.
   * @returns Numele câmpului/câmpurilor, unite prin virgulă, sau `undefined`.
   */
  private extractFieldName(target: unknown): string | undefined {
    if (Array.isArray(target)) {
      return target.join(', ');
    }

    return typeof target === 'string' ? target : undefined;
  }

  /**
   * Construiește `details` în același format ca validarea DTO:
   * `{ email: ["P2002"] }`.
   */
  private buildFieldDetails(fieldName: string | undefined, code: string): ErrorDetails {
    if (!fieldName) {
      return null;
    }

    return { [fieldName]: [code] };
  }
}
