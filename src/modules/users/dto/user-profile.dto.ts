/**
 * Profilul public al utilizatorului (fără id / userId interne).
 * Apare nested în `UserDto.profile`.
 */
export class UserProfileDto {
  /**
   * Prenumele
   * @example Ion
   */
  firstName: string | null;

  /**
   * Numele de familie
   * @example Popescu
   */
  lastName: string | null;

  /**
   * URL-ul avatarului
   * @example https://cdn.example.com/avatars/ion.png
   */
  avatarUrl: string | null;

  /**
   * Locația (oraș / țară)
   * @example Chișinău, Moldova
   */
  location: string | null;

  /**
   * Titlul / funcția profesională
   * @example Software Engineer
   */
  jobTitle: string | null;

  /**
   * Descriere scurtă (bio)
   * @example Pasionat de NestJS și TypeScript.
   */
  bio: string | null;
}
