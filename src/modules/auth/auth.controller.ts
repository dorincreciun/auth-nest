import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users';
import { LoginDto } from './dto';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  public async register(@Req() req: Request, @Body() dto: CreateUserDto) {
    const user = await this.authService.register(dto);
    req.session.userId = user.id;
    return user;
  }

  @Post('login')
  public async login(@Req() req: Request, @Body() dto: LoginDto) {
    const user = await this.authService.login(dto);
    req.session.userId = user.id;
    return user;
  }
}
