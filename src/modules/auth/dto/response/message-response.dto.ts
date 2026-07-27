import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload din `data` pentru logout / confirm email / reset password.
 * Controller returnează: { message }
 */
export class MessageResponseDto {
  @ApiProperty({
    example: 'Operația a fost finalizată cu succes.',
    description: 'Mesaj descriptiv pentru client',
  })
  message: string;
}
