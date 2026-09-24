import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Body: POST /auth/password/forgot
 */
export class ForgotPasswordPayloadDto {
  /**
   * Adresa de email pentru care se solicită resetarea parolei
   * @example test@gmail.com
   */
  @IsEmail({}, { message: 'The email address is not valid' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}
