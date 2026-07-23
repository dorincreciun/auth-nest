import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis';
import { RedisClientType } from 'redis';

@Injectable()
export class SessionService {
  constructor(private readonly redisService: RedisService) {}

  private get redis(): RedisClientType {
    return this.redisService.getClient();
  }
}
