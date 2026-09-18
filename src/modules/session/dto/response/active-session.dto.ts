import { ApiProperty } from '@nestjs/swagger';

import { DeviceDataDto } from './device-data.dto';

/**
 * O sesiune activă a utilizatorului autentificat.
 * `id` este un identificator public derivat prin HMAC — session ID-ul real
 * rămâne pe server, pentru că el însuși este o credențială.
 */
export class ActiveSessionDto {
  /**
   * Identificator public al sesiunii, folosit la revocare
   * @example 9f2c4b7e1a83d5460bc2e7f0a1d93c58
   */
  id: string;

  @ApiProperty({
    type: DeviceDataDto,
    nullable: true,
    description: 'Metadatele dispozitivului; null pentru sesiuni mai vechi, fără metadate.',
  })
  deviceData: DeviceDataDto | null;

  /**
   * Secundele rămase până la expirarea sesiunii
   * @example 2591640
   */
  expiresInSeconds: number;

  /**
   * `true` pentru sesiunea din care vine request-ul curent
   * @example true
   */
  isCurrent: boolean;
}
