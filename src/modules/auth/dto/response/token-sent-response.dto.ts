import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload din `data` pentru verify/send și password/forgot.
 * Controller returnează: { message, tokenExpiresAt }
 */
export class TokenSentResponseDto {
  @ApiProperty({
    example:
      'Un nou cod de verificare a fost trimis pe adresa ta de email. Verifică și folderul Spam.',
    description: 'Mesaj descriptiv pentru client',
  })
  message: string;

  @ApiProperty({
    example: '2026-07-27T08:05:00.000Z',
    description: 'Data de expirare a tokenului (ISO), utilă pentru countdown în frontend',
  })
  tokenExpiresAt: string;
}
