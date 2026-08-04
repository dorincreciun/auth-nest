import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface ApiSuccessResponseOptions {
  status?: number;
  description?: string;
  /** Modele nested care trebuie înregistrate în OpenAPI (ex. UserDto, UserProfileDto). */
  extraModels?: Type<unknown>[];
}

/**
 * Documentează un răspuns de succes exact în forma produsă de
 * `TransformInterceptor`: `{ success, statusCode, meta, data }`.
 *
 * @example
 * \@ApiSuccessResponse(AuthUserDataDto, { status: 201, description: 'Utilizator creat' })
 */
export function ApiSuccessResponse<TData extends Type<unknown>>(
  dataDto: TData,
  options: ApiSuccessResponseOptions = {},
): MethodDecorator & ClassDecorator {
  const { status = 200, description } = options;

  return applyDecorators(
    ApiExtraModels(dataDto, ...(options.extraModels ?? [])),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'statusCode', 'meta', 'data'],
        properties: {
          success: {
            type: 'boolean',
            enum: [true],
            example: true,
            description: 'Indică un răspuns de succes',
          },
          statusCode: {
            type: 'number',
            example: status,
            description: 'Codul HTTP al răspunsului',
          },
          meta: {
            type: 'object',
            required: ['path', 'timestamp'],
            description: 'Meta informații utile pentru client',
            properties: {
              path: { type: 'string', example: '/auth/login' },
              timestamp: {
                type: 'string',
                format: 'date-time',
                example: '2026-07-27T08:00:00.000Z',
              },
            },
          },
          data: { $ref: getSchemaPath(dataDto) },
        },
      },
    }),
  );
}
