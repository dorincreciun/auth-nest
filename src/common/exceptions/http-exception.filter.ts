import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorDetails, ErrorResponse } from '../interfaces';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionStatus = this.resolveExceptionStatus(exception);
    const exceptionResponse = this.resolveExceptionResponse(exception);

    const responseBody: ErrorResponse = {
      success: false,
      statusCode: exceptionStatus,
      message: this.extractMessage(exception, exceptionResponse),
      details: this.extractDetails(exceptionResponse),
      meta: {
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(exceptionStatus).json(responseBody);
  }

  /**
   * Extrage un mesaj de eroare uman-lizibil dintr-o excepție necunoscută.
   *
   * Ordinea de rezolvare:
   * 1. Dacă `exceptionResponse` este un obiect cu proprietatea `message`
   *    (ex: payload custom trimis prin `HttpException`, sau erori de
   *    validare de la `class-validator`, unde `message` poate fi `string[]`).
   * 2. Dacă excepția este o instanță nativă de `Error` (ex: aruncată manual
   *    în cod, fără a trece prin `HttpException`).
   * 3. Fallback: un mesaj generic, pentru cazuri complet neprevăzute.
   *
   * @param exception - Excepția originală, capturată în filter (`unknown`).
   * @param exceptionResponse - Rezultatul apelului `.getResponse()` pe o
   * instanță `HttpException`, dacă există (poate fi `string`, `object` sau `null`).
   * @returns Mesajul de eroare extras, ca `string`.
   */
  private extractMessage(exception: unknown, exceptionResponse: string | object | null): string {
    if (this.hasResponseProperty<'message', string | string[]>(exceptionResponse, 'message')) {
      const { message } = exceptionResponse;
      return Array.isArray(message) ? message.join('\n') : message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  /**
   * Extrage `details` în formatul:
   * `{ email: ["msg1"], password: ["msg2", "msg3"] }`.
   *
   * Orice payload greșit (`details: 'test'`, `details: []`) → `null`.
   */
  private extractDetails(exceptionResponse: string | object | null): ErrorDetails {
    if (
      this.hasResponseProperty<'details', unknown>(exceptionResponse, 'details') &&
      this.isErrorDetails(exceptionResponse.details)
    ) {
      return exceptionResponse.details;
    }

    return null;
  }

  /**
   * Type guard: obiect `{ [field]: string[] }` (nu array, nu null).
   */
  private isErrorDetails(value: unknown): value is Record<string, string[]> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every(
        (messages) =>
          Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
      )
    );
  }

  /**
   * Verifică dacă excepția este o instanță de `HttpException` și îi returnează codul de stare HTTP.
   * În caz contrar, returnează codul `500 Internal Server Error`.
   *
   * @param exception - Excepția prinsă de filtru (de tip `unknown`).
   * @returns Codul de stare HTTP corespunzător excepției sau `HttpStatus.INTERNAL_SERVER_ERROR`.
   */
  private resolveExceptionStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Extrage corpul răspunsului (payload-ul) dintr-o excepție dacă aceasta este de tip `HttpException`.
   *
   * @param exception - Excepția prinsă de filtru (de tip `unknown`).
   * @returns Răspunsul excepției (string sau obiect) dacă este o instanță de `HttpException`, altfel `null`.
   */
  private resolveExceptionResponse(exception: unknown): string | object | null {
    return exception instanceof HttpException ? exception.getResponse() : null;
  }

  /**
   * Type guard generic care verifică dacă `exceptionResponse` este un obiect
   * și conține o anumită proprietate (ex: `message`, `error`, `details`).
   *
   * Util pentru `HttpException`, unde payload-ul poate conține diverse
   * câmpuri custom. Spre deosebire de o variantă bazată pe `unknown`,
   * aici tipul valorii (`T`) se specifică explicit la apel, eliminând
   * nevoia unui cast (`as`) ulterior.
   *
   * @typeParam K - Numele proprietății căutate (string literal).
   * @typeParam T - Tipul așteptat al valorii asociate proprietății.
   * @param exceptionResponse - Rezultatul `.getResponse()` de pe o excepție.
   * @param key - Numele proprietății pe care o cauți în obiect.
   * @returns `true` dacă obiectul conține proprietatea respectivă, cu narrowing de tip.
   */
  private hasResponseProperty<K extends string, T = unknown>(
    exceptionResponse: string | object | null,
    key: K,
  ): exceptionResponse is Record<K, T> {
    return !!exceptionResponse && typeof exceptionResponse === 'object' && key in exceptionResponse;
  }
}
