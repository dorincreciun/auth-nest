import { Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { RedisService } from '../redis';
import { UserActiveSession } from '../redis/types';

@Injectable()
export class SessionService {
  public constructor(private readonly redisService: RedisService) {}

  public getClient(): RedisClientType {
    return this.redisService.getClient();
  }

  public addUserSession(userId: string, sessionId: string): Promise<void> {
    return this.redisService.addUserSession(userId, sessionId);
  }

  public removeUserSession(userId: string, sessionId: string): Promise<void> {
    return this.redisService.removeUserSession(userId, sessionId);
  }

  public getUserSessions(userId: string): Promise<UserActiveSession[]> {
    return this.redisService.getUserSessions(userId);
  }

  public removeAllUserSessions(userId: string): Promise<void> {
    return this.redisService.removeAllUserSessions(userId);
  }
}
