import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Body: POST /auth/register
 */
export class RegisterPayloadDto {
  /**
   * Adresa de email a noului cont
   * @example test@gmail.com
   */
  @IsEmail({}, { message: 'The email address is not valid' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  /**
   * Parola contului (minim 8 caractere, litere mari/mici, cifră și caracter special)
   * @example Password123!
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
  password: string;
}
