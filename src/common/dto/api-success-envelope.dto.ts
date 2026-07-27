import { ApiProperty } from '@nestjs/swagger';

/**
 * Câmpurile comune din envelope-ul de succes (TransformInterceptor).
 * Nu se folosește singur — extinde-l în DTO-uri concrete de tip *ApiResponseDto.
 */
export class ApiSuccessEnvelopeDto {
  @ApiProperty({ example: true, description: 'Indică un răspuns de succes' })
  success: true;

  @ApiProperty({ example: 200, description: 'Codul HTTP al răspunsului' })
  statusCode: number;

  @ApiProperty({
    example: '2026-07-27T08:00:00.000Z',
    description: 'Momentul generării răspunsului (ISO)',
  })
  timestamp: string;

  @ApiProperty({ example: '/auth/login', description: 'Path-ul request-ului' })
  path: string;
}
