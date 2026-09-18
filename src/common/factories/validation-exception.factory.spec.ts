import { UnprocessableEntityException, ValidationError } from '@nestjs/common';

import { validationExceptionFactory } from './validation-exception.factory';

function buildError(overrides: Partial<ValidationError>): ValidationError {
  return { property: 'email', ...overrides };
}

/** Payload-ul aruncat de factory, în forma pe care o normalizează `HttpExceptionFilter`. */
function captureResponse(errors: ValidationError[]): { message: string; details: unknown } {
  try {
    validationExceptionFactory(errors);
  } catch (exception) {
    expect(exception).toBeInstanceOf(UnprocessableEntityException);

    return (exception as UnprocessableEntityException).getResponse() as {
      message: string;
      details: unknown;
    };
  }

  throw new Error('factory ar fi trebuit să arunce');
}

describe('validationExceptionFactory', () => {
  it('grupează mesajele pe câmp', () => {
    const response = captureResponse([
      buildError({ constraints: { isEmail: 'Adresa de email nu este validă' } }),
      buildError({
        property: 'password',
        constraints: { minLength: 'Minim 8 caractere', matches: 'Trebuie o cifră' },
      }),
    ]);

    expect(response.details).toEqual({
      email: ['Adresa de email nu este validă'],
      password: ['Minim 8 caractere', 'Trebuie o cifră'],
    });
  });

  it('folosește căi cu punct pentru erorile nested', () => {
    const response = captureResponse([
      buildError({
        property: 'profile',
        children: [
          buildError({ property: 'firstName', constraints: { isString: 'Text invalid' } }),
        ],
      }),
    ]);

    expect(response.details).toEqual({ 'profile.firstName': ['Text invalid'] });
  });

  it('întoarce details null când nu există constrângeri raportate', () => {
    expect(captureResponse([buildError({})]).details).toBeNull();
  });
});
