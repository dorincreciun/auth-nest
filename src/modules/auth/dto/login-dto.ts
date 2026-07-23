import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString({ message: 'Parola trebuie să fie un text' })
  @IsNotEmpty({ message: 'Parola este obligatorie' })
  password: string;
}
