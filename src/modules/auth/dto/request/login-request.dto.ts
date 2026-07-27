import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/** Body: POST /auth/login */
export class LoginRequestDto {
  @ApiProperty({
    example: 'test@gmail.com',
    description: 'Adresa de email a contului',
  })
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Parola contului',
  })
  @IsString({ message: 'Parola trebuie să fie un text' })
  @IsNotEmpty({ message: 'Parola este obligatorie' })
  password: string;
}
