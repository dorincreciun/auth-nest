import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto, ResponseUserDto, UserMapper } from '../users';
import { LoginDto } from './dto';
import { extractDeviceData } from '../../common/utils';
import { Auth } from './decorators';
import { CurrentUser } from '../../common/decorators';
import { type User } from '@prisma/client';
import { ConfirmEmailDto } from './dto/confirm-email.dto';

@Controller('auth')
export class AuthController {
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
  public async register(@Req() req: Request, @Body() dto: CreateUserDto): Promise<ResponseUserDto> {
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
  public async login(@Req() req: Request, @Body() dto: LoginDto): Promise<ResponseUserDto> {
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
  ): Promise<{ message: string }> {
    await this.destroySession(req);

    const sessionCookieName = this.config.getOrThrow<string>('SESSION_NAME');
    res.clearCookie(sessionCookieName, { path: '/' });

    return { message: 'Deconectare reușită' };
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
  public async confirmEmail(@CurrentUser() user: User, @Body() dto: ConfirmEmailDto) {
    return this.authService.confirmEmail(user, dto.token);
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
          reject(new InternalServerErrorException('Eroare la reînnoirea sesiunii'));
          return;
        }

        Object.assign(req.session, sessionData);

        req.session.save((saveErr: Error | null) => {
          if (saveErr) {
            reject(new InternalServerErrorException('Eroare la salvarea sesiunii'));
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
          reject(new InternalServerErrorException('A apărut o eroare la deconectare'));
          return;
        }
        resolve();
      });
    });
  }
}
