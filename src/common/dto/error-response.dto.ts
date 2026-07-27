import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    example: '2026-07-27T08:00:00.000Z',
    description: 'Momentul generării răspunsului (ISO)',
  })
  timestamp: string;

  @ApiProperty({ example: '/auth/login' })
  path: string;

  @ApiProperty({
    example: ['Email sau parolă incorectă'],
    type: [String],
    description: 'Lista mesajelor de eroare',
  })
  message: string[];

  @ApiProperty({
    example: 'Unauthorized',
    description: 'Eticheta erorii (sau cod Prisma, etc.)',
  })
  error: string;
}
