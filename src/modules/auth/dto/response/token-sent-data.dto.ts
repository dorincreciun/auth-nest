/**
 * Conținutul `data` pentru verify/send și password/forgot.
 * Controller returnează: { message, tokenExpiresAt }
 */
export class TokenSentDataDto {
  /**
   * Mesaj descriptiv pentru client
   * @example Un nou cod de verificare a fost trimis pe adresa ta de email.
   */
  message: string;

  /**
   * Data de expirare a tokenului (ISO), utilă pentru countdown în frontend
   * @example 2026-07-27T08:05:00.000Z
   */
  tokenExpiresAt: string;
}
