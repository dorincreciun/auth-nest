import { IsString, Length, Matches } from 'class-validator';

export class ConfirmEmailRequestDto {
  @IsString({ message: 'Token-ul trebuie să fie un text.' })
  @Length(6, 6, { message: 'Token-ul trebuie să conțină exact 6 cifre.' })
  @Matches(/^[0-9]+$/, { message: 'Token-ul poate conține doar cifre.' })
  token: string;
}
