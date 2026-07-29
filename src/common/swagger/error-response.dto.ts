import { ApiProperty } from '@nestjs/swagger';

/**
 * Forma standard a răspunsurilor de eroare (produsă de `HttpExceptionFilter`
 * și `PrismaExceptionFilter`). Folosită exclusiv pentru documentația OpenAPI.
 */
export class ErrorResponseDto {
  @ApiProperty({ enum: [false], example: false, description: 'Indică un răspuns de eroare' })
  success: false;

  @ApiProperty({ example: 422, description: 'Codul HTTP al erorii' })
  statusCode: number;

  @ApiProperty({
    example: 'Validation failed',
    description: 'Mesaj human-readable, gata de afișat global',
  })
  message: string;

  @ApiProperty({
    nullable: true,
    description: 'Erori pe câmp. null când eroarea nu e legată de câmpuri.',
    example: {
      email: ['Adresa de email nu este validă'],
      password: ['Parola trebuie să aibă minim 8 caractere'],
    },
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  details: Record<string, string[]> | null;

  @ApiProperty({
    example: { path: '/auth/login', timestamp: '2026-07-27T08:00:00.000Z' },
    description: 'Meta informații utile pentru debugging',
    type: 'object',
    additionalProperties: false,
    properties: {
      path: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  })
  meta: { path: string; timestamp: string };
}
