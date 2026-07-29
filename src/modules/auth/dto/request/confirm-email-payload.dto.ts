import { IsString, Length, Matches } from 'class-validator';

/**
 * Body: POST /auth/email/verify/confirm
 */
export class ConfirmEmailPayloadDto {
  /**
   * Codul OTP de 6 cifre primit pe email
   * @example 123456
   */
  @IsString({ message: 'Token-ul trebuie să fie un text.' })
  @Length(6, 6, { message: 'Token-ul trebuie să conțină exact 6 cifre.' })
  @Matches(/^[0-9]+$/, { message: 'Token-ul poate conține doar cifre.' })
  token: string;
}
