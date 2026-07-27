import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

/** Body: POST /auth/password/forgot */
export class ForgotPasswordRequestDto {
  @ApiProperty({
    example: 'test@gmail.com',
    description: 'Adresa de email pentru care se solicită resetarea parolei',
  })
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}
