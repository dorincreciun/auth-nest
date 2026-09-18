import { Module } from '@nestjs/common';

import { UsersModule } from '../users';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

@Module({
  imports: [UsersModule],
  controllers: [SessionController],
  providers: [SessionRepository, SessionService],
  exports: [SessionService],
})
export class SessionModule {}
