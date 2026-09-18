import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

import { redisConfig } from '../../config';

/**
 * Deține conexiunea Redis a aplicației și nimic altceva: cine are nevoie de
 * chei sau structuri de date își construiește propriul repository peste client.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  public constructor(
    @Inject(redisConfig.KEY) private readonly config: ConfigType<typeof redisConfig>,
  ) {
    const socket = {
      host: this.config.host,
      port: this.config.port,
      connectTimeout: this.config.connectTimeoutMs,
    };

    this.client = createClient({
      username: this.config.username,
      password: this.config.password,
      socket: this.config.tls ? { ...socket, tls: true } : socket,
    });

    this.client.on('error', (error) => this.logger.error('Eroare client Redis', error));
    this.client.on('ready', () => this.logger.log('Conexiune Redis disponibilă'));
  }

  public async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  /** Folosit de health check-uri pentru a confirma că serverul răspunde. */
  public async ping(): Promise<void> {
    await this.client.ping();
  }
}
