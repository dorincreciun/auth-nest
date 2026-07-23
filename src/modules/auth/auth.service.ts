import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HashService } from '../hash';
import { CreateUserDto, UsersService } from '../users';
import { LoginDto, VerificationEmailResponseDto } from './dto';
import { TokenService } from './token.service';
import { MailerService } from '../mailer';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  public constructor(
    private hashService: HashService,
    private userService: UsersService,
    private tokenService: TokenService,
    private mailerService: MailerService,
  ) {}

  /**
   * Înregistrează unutilizator nou în sistem.
   * Validează unicitatea emailului, realizează hash-ul parolei și salvează datele în baza de date.
   */
  public async register(dto: CreateUserDto): Promise<User> {
    const userExists = await this.userService.exists(dto.email);

    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.hashService.hash(dto.password);
    return await this.userService.create({
      ...dto,
      password: passwordHash,
    });
  }

  /**
   * Autentifică un utilizator existent.
   * Verifică existența adresa de email și corectitudinea parolei introduse.
   */
  public async login(dto: LoginDto): Promise<User> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email sau parolă incorectă');
    }

    const isPasswordMatching = await this.hashService.compare(dto.password, user.password);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email sau parolă incorectă');
    }

    return user;
  }

  /**
   * Trimite sau retrimite codul de verificare pe email.
   * Returnează mesajul de succes și data de expirare a tokenului pentru countdown-ul din frontend.
   */
  public async sendVerificationEmail(user: User): Promise<VerificationEmailResponseDto> {
    const { isVerified, id, email } = user;

    if (isVerified) {
      throw new BadRequestException('Adresa de email este deja confirmată.');
    }

    const { expiresAt, token } = await this.tokenService.createToken(
      id,
      'EMAIL_VERIFICATION',
      '5m',
    );

    await this.mailerService.sendVerificationEmail(email, token, expiresAt);

    return {
      message:
        'Un nou cod de verificare a fost trimis pe adresa ta de email. Verifică și folderul Spam.',
      tokenExpiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Confirmă adresa de email folosind codul introdus de utilizator.
   */
  public async confirmEmail(user: User, token: string) {
    const { isVerified, id } = user;

    if (isVerified) {
      throw new BadRequestException('Adresa de email este deja confirmată.');
    }

    await this.tokenService.verifyToken(id, token, 'EMAIL_VERIFICATION');
    await this.userService.update(id, { isVerified: true });

    return {
      message: 'Adresa ta de email a fost confirmată cu succes! Contul tău este acum activ.',
    };
  }
}
