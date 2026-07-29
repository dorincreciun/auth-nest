import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Body: POST /auth/password/reset
 */
export class ResetPasswordPayloadDto {
  /**
   * Adresa de email a contului
   * @example test@gmail.com
   */
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  /**
   * Codul OTP de 6 cifre primit pe email
   * @example 123456
   */
  @IsString({ message: 'Token-ul trebuie să fie un text.' })
  @Length(6, 6, { message: 'Token-ul trebuie să conțină exact 6 cifre.' })
  @Matches(/^[0-9]+$/, { message: 'Token-ul poate conține doar cifre.' })
  token: string;

  /**
   * Noua parolă (minim 8 caractere, litere mari/mici, cifră și caracter special)
   * @example NewPassword123!
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
  newPassword: string;
}
