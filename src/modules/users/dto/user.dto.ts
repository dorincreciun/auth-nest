import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from './user-profile.dto';

/**
 * Reprezentarea publică a unui utilizator (fără câmpuri sensibile).
 *
 * - La `GET /auth/me`: `profile` este populat (sau `null` dacă lipsește în DB).
 * - La `register` / `login`: `profile` este `null` (nu se încarcă relația).
 */
export class UserDto {
  /**
   * Identificatorul unic al utilizatorului (UUID)
   * @example 123e4567-e89b-12d3-a456-426614174000
   */
  id: string;

  /**
   * Adresa de email a utilizatorului
   * @example test@gmail.com
   */
  email: string;

  /**
   * Dacă adresa de email a fost confirmată
   * @example false
   */
  isVerified: boolean;

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
   * Profilul public nested. `null` când relația nu a fost încărcată
   * (ex. login/register) sau când userul nu are încă rând în `user_profiles`.
   */
  @ApiProperty({
    type: UserProfileDto,
    nullable: true,
    description: 'Profilul public nested. null pe login/register; populat pe GET /auth/me.',
  })
  profile: UserProfileDto | null;
}
