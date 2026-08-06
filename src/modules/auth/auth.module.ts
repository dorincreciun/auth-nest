import { Module, forwardRef } from '@nestjs/common';
import { HashModule } from '../hash';
import { MailerModule } from '../mailer';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards';
import { TokenService } from './token.service';

@Module({
  imports: [HashModule, forwardRef(() => UsersModule), MailerModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
