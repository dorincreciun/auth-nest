/**
 * Reprezentarea publică a unui utilizator (fără câmpuri sensibile).
 * Este forma expusă către client în toate răspunsurile care conțin un user.
 */
export class UserDto {
  /**
   * Adresa de email a utilizatorului
   * @example test@gmail.com
   */
  email: string;

  /**
   * Identificatorul unic al utilizatorului (UUID)
   * @example 123e4567-e89b-12d3-a456-426614174000
   */
  id: string;

  /**
   * Data și ora la care a fost creat contul
   * @example 2026-07-24T12:00:00.000Z
   */
  createdAt: Date;

  /**
   * Data și ora ultimei actualizări a contului
   * @example 2026-07-24T12:30:00.000Z
   */
  updatedAt: Date;

  /**
   * Dacă adresa de email a fost confirmată
   * @example false
   */
  isVerified: boolean;

  /**
   * Prenumele utilizatorului
   * @example Ion
   */
  firstName: string | null;

  /**
   * Numele de familie al utilizatorului
   * @example Popescu
   */
  lastName: string | null;
}
