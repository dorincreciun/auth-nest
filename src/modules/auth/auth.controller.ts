import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Auth, CurrentUser } from '../../common/decorators';
import { ApiSuccessResponse, ErrorResponseDto } from '../../common/swagger';
import { SessionService } from '../session';
import { UserDto, UserMapper, UserProfileDto, UsersService } from '../users';
import { AuthService } from './auth.service';
import {
  AuthUserDataDto,
  ForgotPasswordPayloadDto,
  LoginPayloadDto,
  MessageDataDto,
  RegisterPayloadDto,
  ResetPasswordPayloadDto,
  TokenSentDataDto,
} from './dto';

const USER_EXTRA_MODELS = [UserDto, UserProfileDto];

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private static readonly MESSAGES = {
    LOGOUT_SUCCESS: 'Signed out',
    USER_NOT_AUTHENTICATED: 'You are not signed in. Sign in to continue.',
  } as const;

  public constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {}

  /** Creează un cont nou și pornește imediat o sesiune autenticată. */
  @SkipThrottle({ short: true, medium: true })
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  @ApiOperation({
    summary: 'Înregistrare utilizator nou',
    description:
      'Creează contul, inițiază sesiunea și returnează userul public. ' +
      '`user.profile` este `null` aici (profilul se citește pe GET /auth/me).',
  })
  @ApiSuccessResponse(AuthUserDataDto, {
    status: 201,
    description: 'Utilizator creat și sesiune inițiată (profile: null)',
    extraModels: USER_EXTRA_MODELS,
  })
  @ApiResponse({ status: 409, description: 'Conflict la înregistrare', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async register(
    @Req() request: Request,
    @Body() payload: RegisterPayloadDto,
  ): Promise<AuthUserDataDto> {
    const user = await this.authService.register(payload);
    await this.sessionService.start(request, user.id);

    return { user: UserMapper.toDto(user) };
  }

  /** Autentifică utilizatorul și pornește o sesiune nouă. */
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 5, ttl: 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Autentificare cu email și parolă',
    description:
      'Validează credențialele, regenerează sesiunea și returnează userul public. ' +
      '`user.profile` este `null` aici (profilul se citește pe GET /auth/me).',
  })
  @ApiSuccessResponse(AuthUserDataDto, {
    status: 200,
    description: 'Autentificare reușită (profile: null)',
    extraModels: USER_EXTRA_MODELS,
  })
  @ApiResponse({ status: 401, description: 'Credențiale invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public async login(
    @Req() request: Request,
    @Body() payload: LoginPayloadDto,
  ): Promise<AuthUserDataDto> {
    const user = await this.authService.login(payload);
    await this.sessionService.start(request, user.id);

    return { user: UserMapper.toDto(user) };
  }

  /** Închide sesiunea curentă și șterge cookie-ul din browser. */
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 10, ttl: 60 * 1000 } })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Deconectare (închide sesiunea curentă)' })
  @ApiSuccessResponse(MessageDataDto, { status: 200, description: 'Deconectare reușită' })
  public async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageDataDto> {
    await this.sessionService.destroy(request);
    this.sessionService.clearCookie(response);

    return { message: AuthController.MESSAGES.LOGOUT_SUCCESS };
  }

  /** Contul din sesiunea curentă, împreună cu profilul nested. */
  @SkipThrottle({ medium: true, long: true })
  @Throttle({ short: { limit: 30, ttl: 60 * 1000 } })
  @Auth()
  @HttpCode(HttpStatus.OK)
  @Get('me')
  @ApiOperation({
    summary: 'Profilul utilizatorului autentificat',
    description:
      'Returnează contul curent împreună cu profilul nested (`user.profile`), ' +
      'spre deosebire de register/login unde relația nu este încărcată.',
  })
  @ApiSuccessResponse(AuthUserDataDto, {
    status: 200,
    description: 'Utilizator + profil nested din sesiune',
    extraModels: USER_EXTRA_MODELS,
  })
  public async getMe(@CurrentUser('id') userId: string): Promise<AuthUserDataDto> {
    const user = await this.usersService.findByIdWithProfile(userId);

    if (!user) {
      throw new UnauthorizedException(AuthController.MESSAGES.USER_NOT_AUTHENTICATED);
    }

    return { user: UserMapper.toDtoWithProfile(user) };
  }

  /**
   * Pornește resetarea parolei.
   * Răspunsul e identic pentru orice adresă, ca să nu permită enumerarea conturilor.
   */
  @SkipThrottle({ short: true, medium: true })
  @Throttle({ long: { limit: 3, ttl: 60 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  @ApiOperation({ summary: 'Solicită resetarea parolei' })
  @ApiSuccessResponse(TokenSentDataDto, {
    status: 200,
    description: 'Răspuns generic (email trimis dacă adresa există)',
  })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public forgotPassword(@Body() payload: ForgotPasswordPayloadDto): Promise<TokenSentDataDto> {
    return this.authService.forgotPassword(payload);
  }

  /** Schimbă parola cu codul primit pe email și deconectează toate dispozitivele. */
  @SkipThrottle({ short: true, long: true })
  @Throttle({ medium: { limit: 5, ttl: 5 * 60 * 1000 } })
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  @ApiOperation({ summary: 'Resetează parola cu codul primit pe email' })
  @ApiSuccessResponse(MessageDataDto, { status: 200, description: 'Parola a fost resetată' })
  @ApiResponse({ status: 400, description: 'Cod invalid / expirat', type: ErrorResponseDto })
  @ApiResponse({ status: 422, description: 'Date invalide', type: ErrorResponseDto })
  @ApiResponse({ status: 429, description: 'Prea multe cereri', type: ErrorResponseDto })
  public resetPassword(@Body() payload: ResetPasswordPayloadDto): Promise<MessageDataDto> {
    return this.authService.resetPassword(payload);
  }
}
