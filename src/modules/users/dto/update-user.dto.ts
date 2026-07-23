import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { AtLeastOneProperty } from '../../../common/decorators';

@AtLeastOneProperty({ message: 'Trebuie să completezi cel puțin un câmp din profil!' })
export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Adresa de email nu este validă' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsString({ message: 'Parola trebuie să fie un text' })
  @MinLength(8, { message: 'Parola trebuie să aibă minim 8 caractere' })
  @MaxLength(64, { message: 'Parola nu poate depăși 64 de caractere' })
  @Matches(/(?=.*[a-z])/, { message: 'Parola trebuie să conțină cel puțin o literă mică' })
  @Matches(/(?=.*[A-Z])/, { message: 'Parola trebuie să conțină cel puțin o literă mare' })
  @Matches(/(?=.*\d)/, { message: 'Parola trebuie să conțină cel puțin o cifră' })
  password?: string;

  @IsOptional()
  @IsString({ message: 'Prenumele trebuie să fie un text' })
  @MinLength(2, { message: 'Prenumele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Prenumele nu poate depăși 50 de caractere' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Numele trebuie să fie un text' })
  @MinLength(2, { message: 'Numele trebuie să aibă minim 2 caractere' })
  @MaxLength(50, { message: 'Numele nu poate depăși 50 de caractere' })
  lastName?: string;

  @IsOptional()
  isVerified?: boolean;
}
