import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import ms from 'ms';
import { HashService } from '../hash';
import { MailerService } from '../mailer';
import { CreateUserPayloadDto } from '../users/dto';
import { UsersService } from '../users/users.service';
import {
  ForgotPasswordPayloadDto,
  LoginPayloadDto,
  MessageDataDto,
  ResetPasswordPayloadDto,
  TokenSentDataDto,
} from './dto';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private static readonly PASSWORD_RESET_TOKEN_TTL = '5m' as const;

  private static readonly MESSAGES = {
    REGISTER_CONFLICT:
      'Nu s-a putut finaliza înregistrarea. Verifică datele sau autentifică-te dacă ai deja un cont.',
    LOGIN_INVALID_CREDENTIALS: 'Email sau parolă incorectă',
    EMAIL_ALREADY_VERIFIED: 'Adresa de email este deja confirmată.',
    EMAIL_VERIFICATION_SENT:
      'Un nou cod de verificare a fost trimis pe adresa ta de email. Verifică și folderul Spam.',
    EMAIL_CONFIRMED: 'Adresa ta de email a fost confirmată cu succes! Contul tău este acum activ.',
    PASSWORD_RESET_SENT:
      'Dacă există un cont cu această adresă, vei primi un email cu instrucțiuni de resetare. Verifică și folderul Spam.',
    PASSWORD_RESET_SUCCESS: 'Parola ta a fost resetată cu succes.',
  } as const;

  public constructor(
    private hashService: HashService,
    private userService: UsersService,
    private tokenService: TokenService,
    private mailerService: MailerService,
  ) {}

  /**
   * Înregistrează un utilizator nou în sistem.
   * Validează unicitatea emailului, realizează hash-ul parolei și salvează datele în baza de date.
   */
  public async register(dto: CreateUserPayloadDto): Promise<User> {
    const userExists = await this.userService.exists(dto.email);
    const passwordHash = await this.hashService.hash(dto.password);

    if (userExists) {
      throw new ConflictException(AuthService.MESSAGES.REGISTER_CONFLICT);
    }

    return await this.userService.create({
      ...dto,
      password: passwordHash,
    });
  }

  /**
   * Autentifică un utilizator existent.
   * Verifică existența adresei de email și corectitudinea parolei introduse.
   */
  public async login(dto: LoginPayloadDto): Promise<User> {
    const user = await this.userService.findByEmail(dto.email);
    const passwordHash = user?.password ?? this.hashService.getDummyHash();
    const isPasswordMatching = await this.hashService.compare(dto.password, passwordHash);

    if (!user || !isPasswordMatching) {
      throw new UnauthorizedException(AuthService.MESSAGES.LOGIN_INVALID_CREDENTIALS);
    }

    return user;
  }

  /**
   * Trimite sau retrimite codul de verificare pe email.
   * Returnează mesajul de succes și data de expirare a tokenului pentru countdown-ul din frontend.
   */
  public async sendVerificationEmail(user: User): Promise<TokenSentDataDto> {
    const { isVerified, id, email } = user;

    if (isVerified) {
      throw new BadRequestException(AuthService.MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    const { expiresAt, token } = await this.tokenService.createToken(
      id,
      'EMAIL_VERIFICATION',
      '5m',
    );

    await this.mailerService.sendVerificationEmail(email, token, expiresAt);

    return {
      message: AuthService.MESSAGES.EMAIL_VERIFICATION_SENT,
      tokenExpiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Confirmă adresa de email folosind codul introdus de utilizator.
   */
  public async confirmEmail(user: User, token: string): Promise<MessageDataDto> {
    const { isVerified, id, email } = user;

    if (isVerified) {
      throw new BadRequestException(AuthService.MESSAGES.EMAIL_ALREADY_VERIFIED);
    }

    await this.tokenService.verifyTokenByEmail(email, token, 'EMAIL_VERIFICATION');
    await this.userService.update(id, { isVerified: true });

    return {
      message: AuthService.MESSAGES.EMAIL_CONFIRMED,
    };
  }

  /**
   * Pornește fluxul de resetare a parolei.
   * Răspunsul e identic indiferent dacă emailul există, ca să nu permită enumerarea conturilor.
   */
  public async forgotPassword(dto: ForgotPasswordPayloadDto): Promise<TokenSentDataDto> {
    const user = await this.userService.findByEmail(dto.email);
    const fallbackExpiresAt = new Date(Date.now() + ms(AuthService.PASSWORD_RESET_TOKEN_TTL));

    if (!user) {
      return {
        message: AuthService.MESSAGES.PASSWORD_RESET_SENT,
        tokenExpiresAt: fallbackExpiresAt.toISOString(),
      };
    }

    try {
      const { expiresAt, token } = await this.tokenService.createToken(
        user.id,
        'RESET_PASSWORD',
        AuthService.PASSWORD_RESET_TOKEN_TTL,
      );

      await this.mailerService.sendPasswordResetEmail(user.email, token, expiresAt);

      return {
        message: AuthService.MESSAGES.PASSWORD_RESET_SENT,
        tokenExpiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }

      return {
        message: AuthService.MESSAGES.PASSWORD_RESET_SENT,
        tokenExpiresAt: fallbackExpiresAt.toISOString(),
      };
    }
  }

  public async resetPassword(dto: ResetPasswordPayloadDto): Promise<MessageDataDto> {
    const { email, newPassword, token } = dto;

    await this.tokenService.verifyTokenByEmail(email, token, 'RESET_PASSWORD');

    const user = await this.userService.findByEmail(email);
    const passwordHash = await this.hashService.hash(newPassword);
    await this.userService.update(user!.id, { password: passwordHash });

    return {
      message: AuthService.MESSAGES.PASSWORD_RESET_SUCCESS,
    };
  }
}
