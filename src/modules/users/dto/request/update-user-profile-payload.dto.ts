import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Body pentru actualizarea profilului utilizatorului autentificat.
 * Cel puțin un câmp ar trebui trimis (validarea „at least one” pe endpoint, dacă e cazul).
 */
export class UpdateUserProfilePayloadDto {
  /**
   * Prenumele
   * @example Ion
   */
  @IsOptional()
  @IsString({ message: 'Prenumele trebuie să fie un text' })
  @MaxLength(50, { message: 'Prenumele nu poate depăși 50 de caractere' })
  firstName?: string;

  /**
   * Numele de familie
   * @example Popescu
   */
  @IsOptional()
  @IsString({ message: 'Numele trebuie să fie un text' })
  @MaxLength(50, { message: 'Numele nu poate depăși 50 de caractere' })
  lastName?: string;

  /**
   * URL-ul avatarului
   * @example https://cdn.example.com/avatars/ion.png
   */
  @IsOptional()
  @IsUrl({}, { message: 'URL-ul avatarului nu este valid' })
  avatarUrl?: string;

  /**
   * Locația (oraș / țară)
   * @example Chișinău, Moldova
   */
  @IsOptional()
  @IsString({ message: 'Locația trebuie să fie un text' })
  @MaxLength(100, { message: 'Locația nu poate depăși 100 de caractere' })
  location?: string;

  /**
   * Titlul / funcția profesională
   * @example Software Engineer
   */
  @IsOptional()
  @IsString({ message: 'Titlul trebuie să fie un text' })
  @MaxLength(100, { message: 'Titlul nu poate depăși 100 de caractere' })
  jobTitle?: string;

  /**
   * Descriere scurtă (bio)
   * @example Pasionat de NestJS și TypeScript.
   */
  @IsOptional()
  @IsString({ message: 'Bio trebuie să fie un text' })
  @MaxLength(500, { message: 'Bio nu poate depăși 500 de caractere' })
  bio?: string;
}
