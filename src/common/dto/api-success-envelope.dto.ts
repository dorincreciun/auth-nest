import { ApiProperty } from '@nestjs/swagger';

/**
 * Câmpurile comune din envelope-ul de succes (`TransformInterceptor`).
 * Nu se folosește singur — extinde-l în DTO-uri concrete de tip `*ApiResponseDto`.
 */
export class ApiSuccessEnvelopeDto {
  @ApiProperty({ enum: [true], example: true, description: 'Indică un răspuns de succes' })
  success: true;

  @ApiProperty({ example: 200, description: 'Codul HTTP al răspunsului' })
  statusCode: number;

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
