import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';

import { SkipResponseTransform } from '../../common/decorators';
import { PrismaHealthIndicator, RedisHealthIndicator } from './indicators';

/**
 * Sonde pentru orchestratoare și monitorizare.
 *
 * Răspunsurile păstrează formatul Terminus (fără envelope-ul aplicației), pentru
 * că e formatul pe care îl așteaptă uneltele care le citesc.
 */
@ApiExcludeController()
@SkipThrottle()
@SkipResponseTransform()
@Controller('health')
export class HealthController {
  public constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  /** Readiness: procesul poate servi trafic doar dacă dependențele răspund. */
  @Get()
  @HealthCheck()
  public check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.prismaIndicator.isHealthy(),
      () => this.redisIndicator.isHealthy(),
    ]);
  }

  /** Liveness: procesul rulează. Nu atinge dependențele, ca să nu provoace restarturi în cascadă. */
  @Get('live')
  @HealthCheck()
  public checkLiveness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([]);
  }
}
