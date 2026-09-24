import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Body: POST /auth/login
 */
export class LoginPayloadDto {
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
   * Parola contului
   * @example Password123!
   */
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
