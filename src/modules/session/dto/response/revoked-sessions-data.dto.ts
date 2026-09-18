/** Conținutul `data` pentru endpoint-urile de revocare. */
export class RevokedSessionsDataDto {
  /**
   * Mesaj descriptiv pentru client
   * @example Celelalte dispozitive au fost deconectate.
   */
  message: string;

  /**
   * Numărul de sesiuni închise
   * @example 2
   */
  revoked: number;
}
