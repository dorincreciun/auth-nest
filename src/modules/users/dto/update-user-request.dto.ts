import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AtLeastOneProperty } from '../../../common/decorators';

@AtLeastOneProperty({ message: 'Trebuie să completezi cel puțin un câmp din profil!' })
export class UpdateUserRequestDto {
  @ApiPropertyOptional({
    example: 'test@gmail.com',
    description: 'Noua adresă de email a utilizatorului',
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ApiPropertyOptional({
    example: 'NewPassword123!',
    description: 'Noua parolă a contului (minim 8 caractere, conține litere mari, mici și cifre)',
    type: String,
    minLength: 8,
    maxLength: 64,
  })
  @IsOptional()
  @IsString({ message: 'Parola trebuie să fie un text' })
  @MinLength(8, { message: 'Parola trebuie să aibă minim 8 caractere' })
  @MaxLength(64, { message: 'Parola nu poate depăși 64 de caractere' })
  @Matches(/(?=.*[a-z])/, { message: 'Parola trebuie să conțină cel puțin o literă mică' })
  @Matches(/(?=.*[A-Z])/, { message: 'Parola trebuie să conțină cel puțin o literă mare' })
  @Matches(/(?=.*\d)/, { message: 'Parola trebuie să conțină cel puțin o cifră' })
  password?: string;

  @ApiPropertyOptional({
    example: 'Ion',
    description: 'Noul prenume al utilizatorului',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Prenumele trebuie să fie un text' })
  @MinLength(2, { message: 'Prenumele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Prenumele nu poate depăși 50 de caractere' })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Popescu',
    description: 'Noul nume de familie al utilizatorului',
    type: String,
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Numele trebuie să fie un text' })
  @MinLength(2, { message: 'Numele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Numele nu poate depăși 50 de caractere' })
  lastName?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Starea de verificare a adresei de email',
    type: Boolean,
  })
  @IsOptional()
  isVerified?: boolean;
}
