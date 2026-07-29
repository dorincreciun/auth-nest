import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ example: 422 })
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
      password: [
        'Parola trebuie să aibă minim 8 caractere',
        'Parola trebuie să conțină o cifră',
      ],
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
    description: 'Meta informații utile pentru client',
    type: 'object',
    additionalProperties: false,
    properties: {
      path: { type: 'string' },
      timestamp: { type: 'string' },
    },
  })
  meta: { path: string; timestamp: string };
}
