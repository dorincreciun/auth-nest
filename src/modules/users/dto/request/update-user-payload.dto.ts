import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { AtLeastOneProperty } from '../../../../common/decorators';

/**
 * Body pentru actualizarea profilului unui utilizator.
 * Cel puțin un câmp trebuie completat.
 */
@AtLeastOneProperty({ message: 'Trebuie să completezi cel puțin un câmp din profil!' })
export class UpdateUserPayloadDto {
  /**
   * Noua adresă de email a utilizatorului
   * @example test@gmail.com
   */
  @IsOptional()
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  /**
   * Noua parolă a contului (minim 8 caractere, litere mari/mici și cifre)
   * @example NewPassword123!
   */
  @IsOptional()
  @IsString({ message: 'Parola trebuie să fie un text' })
  @MinLength(8, { message: 'Parola trebuie să aibă minim 8 caractere' })
  @MaxLength(64, { message: 'Parola nu poate depăși 64 de caractere' })
  @Matches(/(?=.*[a-z])/, { message: 'Parola trebuie să conțină cel puțin o literă mică' })
  @Matches(/(?=.*[A-Z])/, { message: 'Parola trebuie să conțină cel puțin o literă mare' })
  @Matches(/(?=.*\d)/, { message: 'Parola trebuie să conțină cel puțin o cifră' })
  password?: string;

  /**
   * Noul prenume al utilizatorului
   * @example Ion
   */
  @IsOptional()
  @IsString({ message: 'Prenumele trebuie să fie un text' })
  @MinLength(2, { message: 'Prenumele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Prenumele nu poate depăși 50 de caractere' })
  firstName?: string;

  /**
   * Noul nume de familie al utilizatorului
   * @example Popescu
   */
  @IsOptional()
  @IsString({ message: 'Numele trebuie să fie un text' })
  @MinLength(2, { message: 'Numele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Numele nu poate depăși 50 de caractere' })
  lastName?: string;

  /**
   * Starea de verificare a adresei de email
   * @example true
   */
  @IsOptional()
  isVerified?: boolean;
}
