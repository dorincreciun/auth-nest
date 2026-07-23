import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { EnvironmentInterface } from '../../common/interfaces';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor(private readonly config: ConfigService<EnvironmentInterface>) {
    this.client = createClient({
      // username: this.config.getOrThrow<string>('REDIS_USER'),
      // password: this.config.getOrThrow<string>('REDIS_PASSWORD'),
      // socket: {
      //   host: this.config.getOrThrow<string>('REDIS_HOST'),
      //   port: this.config.getOrThrow<number>('REDIS_PORT'),
      //   tls: true,
      //   connectTimeout: 10000,
      // },
      url: this.config.getOrThrow<string>('REDIS_URL'),
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    this.client.on('connect', () => console.log('Redis connect event fired'));

    this.client.on('ready', () => console.log('Redis ready'));
  }

  public async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  public getClient(): RedisClientType {
    return this.client;
  }
}
