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
import { CreateUserDto } from '../users';
import { LoginDto } from './dto';
import { extractDeviceData } from '../../common/utils';
import { Auth } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  public async register(@Req() req: Request, @Body() dto: CreateUserDto) {
    const user = await this.authService.register(dto);

    req.session.userId = user.id;
    req.session.deviceData = extractDeviceData(req);
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  public async login(@Req() req: Request, @Body() dto: LoginDto) {
    const user = await this.authService.login(dto);

    req.session.userId = user.id;
    req.session.deviceData = extractDeviceData(req);
    return user;
  }

  @Auth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          return reject(new InternalServerErrorException('A apărut o eroare la deconectare'));
        }
        resolve();
      });
    });

    const sessionCookieName = this.config.getOrThrow<string>('SESSION_NAME');

    res.clearCookie(sessionCookieName, {
      path: '/',
    });

    return { message: 'Deconectare reușită' };
  }
}
