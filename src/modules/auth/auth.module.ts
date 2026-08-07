import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashModule } from '../hash';
import { UsersModule } from '../users';
import { TokenService } from './token.service';
import { MailerModule } from '../mailer';
import { AuthGuard } from '../../common/guards';
import { SessionModule } from '../session';

@Module({
  imports: [HashModule, UsersModule, MailerModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthGuard],
})
export class AuthModule {}
