import { Module } from '@nestjs/common';

import { HashModule } from '../hash';
import { MailerModule } from '../mailer';
import { SessionModule } from '../session';
import { UsersModule } from '../users';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenRepository } from './token.repository';
import { TokenService } from './token.service';

@Module({
  imports: [HashModule, UsersModule, MailerModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService, TokenRepository, TokenService],
})
export class AuthModule {}
