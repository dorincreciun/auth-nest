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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { type User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators';
import { ApiSessionAuth, ApiSuccessResponse, ErrorResponseDto } from '../../common/swagger';
import { extractDeviceData, isProduction } from '../../common/utils';
import { UserMapper } from '../users';
import { AuthService } from './auth.service';
import { Auth } from './decorators';
import {
  AuthUserDataDto,
  ConfirmEmailPayloadDto,
  ForgotPasswordPayloadDto,
  LoginPayloadDto,
  MessageDataDto,
  RegisterPayloadDto,
  ResetPasswordPayloadDto,
  TokenSentDataDto,
} from './dto';

@ApiTags('auth')
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
  @SkipThrottle({ short: true, medium: true })
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 / oră
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @ApiOperation({ summary: 'Înregistrare utilizator nou' })
  @ApiSuccessResponse(AuthUserDataDto, {
    status: 201,
    description: 'Utilizator creat și sesiune inițiată',
  })
  @ApiResponse({ status: 409, description: 'Conflict la înregistrare', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async register(
    @Req() req: Request,
    @Body() dto: RegisterPayloadDto,
  ): Promise<AuthUserDataDto> {
    const user = await this.authService.register(dto);
    await this.startSession(req, user);
    return { user: UserMapper.toDto(user) };
  }

  /**
   * Autentifică un utilizator existent pe baza datelor de login.
   * - Validează credențialele
   * - Creează o sesiune nouă și salvează datele dispozitivului
   * - Returnează profilul utilizatorului
   */
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 5, ttl: 60 * 1000 } }) // 5 / minut
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Autentificare cu email și parolă' })
  @ApiSuccessResponse(AuthUserDataDto, {
    status: 200,
    description: 'Autentificare reușită',
  })
  @ApiResponse({ status: 401, description: 'Credențiale invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async login(@Req() req: Request, @Body() dto: LoginPayloadDto): Promise<AuthUserDataDto> {
    const user = await this.authService.login(dto);
    await this.startSession(req, user);
    return { user: UserMapper.toDto(user) };
  }

  /**
   * Deconectează utilizatorul curent.
   * - Distruge sesiunea activă de pe server/stocare
   * - Șterge cookie-ul de sesiune din browserul clientului
   */
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } }) // 10 / minut
  @ApiSessionAuth()
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Deconectare (distruge sesiunea)' })
  @ApiSuccessResponse(MessageDataDto, {
    status: 200,
    description: 'Deconectare reușită',
  })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageDataDto> {
    await this.destroySession(req);

    const sessionCookieName = this.config.getOrThrow<string>('SESSION_NAME');
    res.clearCookie(sessionCookieName, {
      path: '/',
      domain: this.config.getOrThrow<string>('SESSION_DOMAIN'),
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'lax',
    });

    return { message: AuthController.MESSAGES.LOGOUT_SUCCESS };
  }

  /**
   * Returnează profilul utilizatorului din sesiunea curentă.
   * Protejat de AuthGuard — fără sesiune validă request-ul nu ajunge aici.
   */
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 30, ttl: 60 * 1000 } }) // 30 / minut
  @ApiSessionAuth()
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Get('me')
  @ApiOperation({ summary: 'Profilul utilizatorului autentificat' })
  @ApiSuccessResponse(AuthUserDataDto, {
    status: 200,
    description: 'Profilul utilizatorului din sesiune',
  })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  public getMe(@CurrentUser() user: User): AuthUserDataDto {
    if (!user) {
      throw new UnauthorizedException(AuthController.MESSAGES.USER_NOT_AUTHENTICATED);
    }

    return { user: UserMapper.toDto(user) };
  }

  /**
   * Generează și trimite un cod de 6 cifre pe emailul utilizatorului.
   * - Folosit pentru a valida că adresa de e-mail introdusă la înregistrare este reală.
   */
  @SkipThrottle({ short: true, long: true })
  @Throttle({ medium: { limit: 2, ttl: 5 * 60 * 1000 } }) // 2 / 5 minute
  @ApiSessionAuth()
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify/send')
  @ApiOperation({ summary: 'Trimite codul de verificare a emailului' })
  @ApiSuccessResponse(TokenSentDataDto, {
    status: 200,
    description: 'Cod de verificare trimis pe email',
  })
  @ApiResponse({
    status: 400,
    description: 'Email deja confirmat / token încă valid',
    type: ErrorResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public emailVerifySend(@CurrentUser() user: User): Promise<TokenSentDataDto> {
    return this.authService.sendVerificationEmail(user);
  }

  /**
   * Primește un cod de 6 cifre de la client.
   * - Folosit pentru a valida că adresa de e-mail introdusă la înregistrare este reală.
   */
  @SkipThrottle({ short: true, long: true })
  @Throttle({ medium: { limit: 5, ttl: 5 * 60 * 1000 } }) // 5 / 5 minute
  @ApiSessionAuth()
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify/confirm')
  @ApiOperation({ summary: 'Confirmă emailul cu codul primit' })
  @ApiSuccessResponse(MessageDataDto, {
    status: 200,
    description: 'Email confirmat cu succes',
  })
  @ApiResponse({ status: 400, description: 'Cod invalid / expirat', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Neautentificat', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public confirmEmail(
    @CurrentUser() user: User,
    @Body() dto: ConfirmEmailPayloadDto,
  ): Promise<MessageDataDto> {
    return this.authService.confirmEmail(user, dto.token);
  }

  /**
   * Pornește resetarea parolei pe baza adresei de email.
   * - Dacă există un cont, generează un token RESET_PASSWORD și trimite emailul
   * - Răspunsul e mereu același, ca să nu permită enumerarea conturilor
   */
  @SkipThrottle({ short: true, medium: true })
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 / oră
  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  @ApiOperation({ summary: 'Solicită resetarea parolei' })
  @ApiSuccessResponse(TokenSentDataDto, {
    status: 200,
    description: 'Răspuns generic (email trimis dacă adresa există)',
  })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public forgotPassword(@Body() dto: ForgotPasswordPayloadDto): Promise<TokenSentDataDto> {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Resetează parola folosind codul primit pe email.
   * - Validează emailul, tokenul RESET_PASSWORD și noua parolă
   * - Actualizează parola contului dacă tokenul este valid
   */
  @SkipThrottle({ short: true, long: true })
  @Throttle({ medium: { limit: 5, ttl: 5 * 60 * 1000 } }) // 5 / 5 minute
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  @ApiOperation({ summary: 'Resetează parola cu codul primit pe email' })
  @ApiSuccessResponse(MessageDataDto, {
    status: 200,
    description: 'Parola a fost resetată',
  })
  @ApiResponse({ status: 400, description: 'Cod invalid / expirat', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public resetPassword(@Body() dto: ResetPasswordPayloadDto): Promise<MessageDataDto> {
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
