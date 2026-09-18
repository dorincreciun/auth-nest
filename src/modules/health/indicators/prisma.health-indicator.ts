import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';

import { PrismaService } from '../../prisma';

@Injectable()
export class PrismaHealthIndicator {
  private static readonly KEY = 'database';
  private static readonly TIMEOUT_MS = 3000;

  public constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly prismaService: PrismaService,
  ) {}

  public async isHealthy(): Promise<HealthIndicatorResult> {
    return this.healthIndicatorService
      .check(PrismaHealthIndicator.KEY)
      .attempt(() => this.prismaService.ping())
      .withTimeout(PrismaHealthIndicator.TIMEOUT_MS);
  }
}
