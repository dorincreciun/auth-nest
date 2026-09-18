import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { databaseConfig } from '../../config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public constructor(@Inject(databaseConfig.KEY) config: ConfigType<typeof databaseConfig>) {
    super({ adapter: new PrismaPg({ connectionString: config.url }) });
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Folosit de health check-uri pentru a confirma că baza de date răspunde. */
  public async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
