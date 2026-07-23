import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { HashModule } from '../hash';
import { UsersModule } from '../users';
import { TokenService } from './token.service';
import { MailerModule } from '../mailer';

@Module({
  imports: [HashModule, UsersModule, MailerModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
})
export class AuthModule {}
