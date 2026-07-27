import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { type User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators';
import { extractDeviceData } from '../../common/utils';
import { CreateUserRequestDto, UserMapper, UserResponseDto } from '../users';
import { AuthService } from './auth.service';
import { Auth } from './decorators';
import {
  ConfirmEmailRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  MessageResponseDto,
  ResetPasswordRequestDto,
  TokenSentResponseDto,
} from './dto';

@Controller('auth')
export class AuthController {
  private static readonly MESSAGES = {
    LOGOUT_SUCCESS: 'Deconectare reușită',
    SESSION_REGENERATE_ERROR: 'Eroare la reînnoirea sesiunii',
    SESSION_SAVE_ERROR: 'Eroare la salvarea sesiunii',
    LOGOUT_ERROR: 'A apărut o eroare la deconectare',
    USER_NOT_AUTHENTICATED: 'Nu ești autentificat. Autentifică-te pentru a continua.',
  } as const;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Înregistrează un utilizator nou în sistem.
   * - Apelează serviciul de înregistrare
   * - Inițiază o sesiune nouă securizată (anti-session fixation)
   * - Returnează datele utilizatorului creat
   */
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  public async register(
    @Req() req: Request,
    @Body() dto: CreateUserRequestDto,
  ): Promise<UserResponseDto> {
    const user = await this.authService.register(dto);
    await this.startSession(req, user);
    return UserMapper.toResponseDto(user);
  }

  /**
   * Autentifică un utilizator existent pe baza datelor de login.
   * - Validează credențialele
   * - Creează o sesiune nouă și salvează datele dispozitivului
   * - Returnează profilul utilizatorului
   */
  @HttpCode(HttpStatus.OK)
  @Post('login')
  public async login(@Req() req: Request, @Body() dto: LoginRequestDto): Promise<UserResponseDto> {
    const user = await this.authService.login(dto);
    await this.startSession(req, user);
    return UserMapper.toResponseDto(user);
  }

  /**
   * Deconectează utilizatorul curent.
   * - Distruge sesiunea activă de pe server/stocare
   * - Șterge cookie-ul de sesiune din browserul clientului
   */
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponseDto> {
    await this.destroySession(req);

    const sessionCookieName = this.config.getOrThrow<string>('SESSION_NAME');
    res.clearCookie(sessionCookieName, { path: '/' });

    return { message: AuthController.MESSAGES.LOGOUT_SUCCESS };
  }

  /**
   * Returnează profilul utilizatorului din sesiunea curentă.
   * Protejat de AuthGuard — fără sesiune validă request-ul nu ajunge aici.
   */
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Get('me')
  public getMe(@CurrentUser() user: User): UserResponseDto {
    if (!user) {
      throw new UnauthorizedException(AuthController.MESSAGES.USER_NOT_AUTHENTICATED);
    }

    return UserMapper.toResponseDto(user);
  }

  /**
   * Generează și trimite un cod de 6 cifre pe emailul utilizatorului.
   * - Folosit pentru a valida că adresa de e-mail introdusă la înregistrare este reală.
   */
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify/send')
  public emailVerifySend(@CurrentUser() user: User) {
    return this.authService.sendVerificationEmail(user);
  }

  /**
   * Primite un cod de 6 cifre de la client.
   * - Folosit pentru a valida că adresa de e-mail introdusă la înregistrare este reală.
   */
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify/confirm')
  public async confirmEmail(@CurrentUser() user: User, @Body() dto: ConfirmEmailRequestDto) {
    return this.authService.confirmEmail(user, dto.token);
  }

  /**
   * Pornește resetarea parolei pe baza adresei de email.
   * - Dacă există un cont, generează un token RESET_PASSWORD și trimite emailul
   * - Răspunsul e mereu același, ca să nu permită enumerarea conturilor
   */
  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  public async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
  ): Promise<TokenSentResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Resetează parola folosind codul primit pe email.
   * - Validează emailul, tokenul RESET_PASSWORD și noua parolă
   * - Actualizează parola contului dacă tokenul este valid
   */
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  public async resetPassword(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Helper privat: Regenerează sesiunea (previne atacurile de tip session fixation)
   * și atașează userId-ul și metadatele dispozitivului pe noua sesiune.
   */
  private async startSession(req: Request, user: User): Promise<void> {
    const sessionData = {
      userId: user.id,
      deviceData: extractDeviceData(req),
    };

    return new Promise<void>((resolve, reject) => {
      req.session.regenerate((regenerateErr: Error | null) => {
        if (regenerateErr) {
          reject(
            new InternalServerErrorException(AuthController.MESSAGES.SESSION_REGENERATE_ERROR),
          );
          return;
        }

        Object.assign(req.session, sessionData);

        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            reject(new InternalServerErrorException(AuthController.MESSAGES.SESSION_SAVE_ERROR));
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Helper privat: Distruge complet sesiunea curentă a utilizatorului din backend.
   */
  private async destroySession(req: Request): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      req.session.destroy((err: Error | null) => {
        if (err) {
          reject(new InternalServerErrorException(AuthController.MESSAGES.LOGOUT_ERROR));
          return;
        }
        resolve();
      });
    });
  }
}
