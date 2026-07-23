import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { RedisModule } from '../redis';

@Module({
  imports: [RedisModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
