import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AtLeastOneProperty } from '../../../../common/decorators';

/**
 * Body pentru actualizarea profilului utilizatorului autentificat.
 * Cel puțin un câmp trebuie trimis.
 * Avatarul se actualizează separat (upload), nu prin acest endpoint.
 */
@AtLeastOneProperty({ message: 'Fill in at least one profile field.' })
export class UpdateUserProfilePayloadDto {
  /**
   * Prenumele
   * @example Ion
   */
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName?: string;

  /**
   * Numele de familie
   * @example Popescu
   */
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName?: string;

  /**
   * Locația (oraș / țară)
   * @example Chișinău, Moldova
   */
  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(100, { message: 'Location cannot exceed 100 characters' })
  location?: string;

  /**
   * Titlul / funcția profesională
   * @example Software Engineer
   */
  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  @MaxLength(100, { message: 'Job title cannot exceed 100 characters' })
  jobTitle?: string;

  /**
   * Descriere scurtă (bio)
   * @example Pasionat de NestJS și TypeScript.
   */
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  bio?: string;
}
