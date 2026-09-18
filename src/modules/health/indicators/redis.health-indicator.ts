import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

import { RedisService } from '../../redis';

@Injectable()
export class RedisHealthIndicator {
  private static readonly KEY = 'redis';
  private static readonly TIMEOUT_MS = 3000;

  public constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redisService: RedisService,
  ) {}

  public async isHealthy(): Promise<HealthIndicatorResult> {
    return this.healthIndicatorService
      .check(RedisHealthIndicator.KEY)
      .attempt(() => this.redisService.ping())
      .withTimeout(RedisHealthIndicator.TIMEOUT_MS);
  }
}
