import { UnprocessableEntityException, ValidationError } from '@nestjs/common';
import type { ErrorDetails } from '../interfaces';

/**
 * Transformă erorile `class-validator` în formatul `details`:
 * un obiect unde fiecare cheie e un câmp, iar valoarea e lista de mesaje.
 *
 * @example
 * {
 *   email: ["Adresa de email nu este validă"],
 *   password: ["Parola trebuie să aibă minim 8 caractere", "Parola trebuie să conțină o cifră"]
 * }
 */
function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, error) => {
    const property = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});

    if (messages.length > 0) {
      acc[property] = [...(acc[property] ?? []), ...messages];
    }

    if (error.children && error.children.length > 0) {
      const nested = formatValidationErrors(error.children, property);
      for (const [field, nestedMessages] of Object.entries(nested)) {
        acc[field] = [...(acc[field] ?? []), ...nestedMessages];
      }
    }

    return acc;
  }, {});
}

/**
 * `exceptionFactory` pentru `ValidationPipe`: payload `{ message, details }`
 * pe care `HttpExceptionFilter` îl normalizează în `ErrorResponse`.
 */
export function validationExceptionFactory(errors: ValidationError[]): never {
  const formatted = formatValidationErrors(errors);
  const details: ErrorDetails = Object.keys(formatted).length > 0 ? formatted : null;

  throw new UnprocessableEntityException({
    message: 'Validation failed',
    details,
  });
}
