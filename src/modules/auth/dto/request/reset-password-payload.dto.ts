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
  @IsEmail({}, { message: 'The email address is not valid' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  /**
   * Codul OTP de 6 cifre primit pe email
   * @example 123456
   */
  @IsString({ message: 'The code must be a string.' })
  @Length(6, 6, { message: 'The code must be exactly 6 digits.' })
  @Matches(/^[0-9]+$/, { message: 'The code can contain digits only.' })
  token: string;

  /**
   * Noua parolă (minim 8 caractere, litere mari/mici, cifră și caracter special)
   * @example NewPassword123!
   */
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password cannot exceed 64 characters' })
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one digit',
  })
  @Matches(/(?=.*[@$!%*?&#^()_\-+=])/, {
    message: 'Password must contain at least one special character',
  })
  newPassword: string;
}
