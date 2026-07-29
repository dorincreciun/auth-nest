import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Body pentru crearea unui utilizator (folosit de POST /auth/register).
 */
export class CreateUserPayloadDto {
  /**
   * Adresa unică de email a utilizatorului
   * @example test@gmail.com
   */
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  /**
   * Parola contului (minim 8 caractere, litere mari/mici, cifră și caracter special)
   * @example Password123!
   */
  @IsString({ message: 'Parola trebuie să fie un text' })
  @IsNotEmpty({ message: 'Parola este obligatorie' })
  @MinLength(8, { message: 'Parola trebuie să aibă minim 8 caractere' })
  @MaxLength(64, { message: 'Parola nu poate depăși 64 de caractere' })
  @Matches(/(?=.*[a-z])/, {
    message: 'Parola trebuie să conțină cel puțin o literă mică',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Parola trebuie să conțină cel puțin o literă mare',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Parola trebuie să conțină cel puțin o cifră',
  })
  @Matches(/(?=.*[@$!%*?&#^()_\-+=])/, {
    message: 'Parola trebuie să conțină cel puțin un caracter special',
  })
  password: string;
}
