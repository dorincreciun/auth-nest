import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users';
import { LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  public async register(@Body() dto: CreateUserDto) {
    return await this.authService.register(dto);
  }

  @Post('login')
  public async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }
}
