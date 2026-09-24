import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { User } from '@prisma/client';

import { toMilliseconds } from '../../common/utils';
import { tokenConfig } from '../../config';
import { HashService } from '../hash';
import { MailerService } from '../mailer';
import { SessionService } from '../session';
import { UsersService } from '../users';
import {
  ForgotPasswordPayloadDto,
  LoginPayloadDto,
  MessageDataDto,
  RegisterPayloadDto,
  ResetPasswordPayloadDto,
  TokenSentDataDto,
} from './dto';
import { TokenService } from './token.service';

/**
 * Fluxurile de autentificare: cont nou, login și resetare parolă.
 *
 * Serviciul nu știe nimic despre HTTP sau cookie-uri — pornirea sesiunii rămâne
 * în `SessionService`, apelat de controller.
 */
@Injectable()
export class AuthService {
  private static readonly MESSAGES = {
    REGISTER_CONFLICT:
      'Could not finish registration. Check your details, or sign in if you already have an account.',
    LOGIN_INVALID_CREDENTIALS: 'Incorrect email or password',
    PASSWORD_RESET_SENT:
      'If an account exists for this address, you will receive an email with reset instructions. Check the spam folder as well.',
    PASSWORD_RESET_SUCCESS: 'Your password was reset. All devices have been signed out.',
    RESET_TOKEN_INVALID: 'The reset code is invalid.',
  } as const;

  public constructor(
    private readonly hashService: HashService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly mailerService: MailerService,
    private readonly sessionService: SessionService,
    @Inject(tokenConfig.KEY) private readonly tokens: ConfigType<typeof tokenConfig>,
  ) {}

  /**
   * Creează un cont nou.
   * Parola e hash-uită indiferent dacă emailul există deja, ca durata răspunsului
   * să nu dezvăluie ce adrese sunt înregistrate.
   */
  public async register(payload: RegisterPayloadDto): Promise<User> {
    const [emailTaken, passwordHash] = await Promise.all([
      this.usersService.existsByEmail(payload.email),
      this.hashService.hash(payload.password),
    ]);

    if (emailTaken) {
      throw new ConflictException(AuthService.MESSAGES.REGISTER_CONFLICT);
    }

    return this.usersService.create(payload.email, passwordHash);
  }

  /**
   * Validează credențialele.
   * Când emailul nu există, comparăm totuși cu un hash-fantomă ca timpul de
   * răspuns să fie identic cu cel al unei parole greșite.
   */
  public async login(payload: LoginPayloadDto): Promise<User> {
    const user = await this.usersService.findByEmail(payload.email);
    const passwordHash = user?.password ?? this.hashService.getDummyHash();
    const passwordMatches = await this.hashService.compare(payload.password, passwordHash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(AuthService.MESSAGES.LOGIN_INVALID_CREDENTIALS);
    }

    return user;
  }

  /**
   * Pornește resetarea parolei.
   * Răspunsul e identic pentru adrese existente și inexistente, inclusiv când
   * există deja un cod valabil, ca să nu permită enumerarea conturilor.
   */
  public async forgotPassword(payload: ForgotPasswordPayloadDto): Promise<TokenSentDataDto> {
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      return this.buildGenericResetResponse();
    }

    try {
      const { token, expiresAt } = await this.tokenService.issue(
        user.id,
        'RESET_PASSWORD',
        this.tokens.passwordResetTtl,
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

      return this.buildGenericResetResponse();
    }
  }

  /**
   * Schimbă parola pe baza codului primit pe email și închide toate sesiunile:
   * o parolă compromisă nu trebuie să lase în urmă sesiuni valide.
   */
  public async resetPassword(payload: ResetPasswordPayloadDto): Promise<MessageDataDto> {
    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      throw new BadRequestException(AuthService.MESSAGES.RESET_TOKEN_INVALID);
    }

    await this.tokenService.verify(user.id, payload.token, 'RESET_PASSWORD');

    const passwordHash = await this.hashService.hash(payload.newPassword);
    await this.usersService.changePassword(user.id, passwordHash);
    await this.sessionService.revokeAll(user.id);

    return { message: AuthService.MESSAGES.PASSWORD_RESET_SUCCESS };
  }

  /** Răspunsul neutru folosit pe `password/forgot`, cu un `tokenExpiresAt` plauzibil. */
  private buildGenericResetResponse(): TokenSentDataDto {
    const expiresAt = new Date(Date.now() + toMilliseconds(this.tokens.passwordResetTtl));

    return {
      message: AuthService.MESSAGES.PASSWORD_RESET_SENT,
      tokenExpiresAt: expiresAt.toISOString(),
    };
  }
}
