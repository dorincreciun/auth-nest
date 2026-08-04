import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashModule } from '../hash';
import { UsersModule } from '../users';
import { TokenService } from './token.service';
import { MailerModule } from '../mailer';
import { AuthGuard } from './guards';

@Module({
  imports: [HashModule, UsersModule, MailerModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
