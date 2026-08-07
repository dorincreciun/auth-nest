import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { createClient, RedisClientType } from 'redis';
import { EnvironmentInterface } from '../../common/interfaces';
import { DeviceData } from '../../common/types/express-session';
import { UserActiveSession } from './types';

interface StoredSessionPayload {
  userId?: string;
  deviceData?: DeviceData;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;
  private readonly sessionPrefix: string;
  /** TTL pentru indexul de sesiuni (secunde — Redis EXPIRE). */
  private readonly sessionTtlSeconds: number;

  constructor(private readonly config: ConfigService<EnvironmentInterface>) {
    this.client = createClient({
      username: this.config.getOrThrow<string>('REDIS_USER'),
      password: this.config.getOrThrow<string>('REDIS_PASSWORD'),
      socket: {
        host: this.config.getOrThrow<string>('REDIS_HOST'),
        port: this.config.getOrThrow<number>('REDIS_PORT'),
        tls: false,
        connectTimeout: 10000,
      },
    });

    this.sessionPrefix = this.config.getOrThrow<string>('SESSION_FOLDER');

    const ttlMs = ms(this.config.getOrThrow<StringValue>('SESSION_MAX_AGE'));
    if (typeof ttlMs !== 'number' || ttlMs <= 0) {
      throw new Error('SESSION_MAX_AGE invalid — așteptat un interval ms valid (ex. 7d)');
    }
    this.sessionTtlSeconds = Math.floor(ttlMs / 1000);

    this.client.on('error', (err) => this.logger.error('Redis Client Error', err));
    this.client.on('connect', () => this.logger.log('Redis connect event fired'));
    this.client.on('ready', () => this.logger.log('Redis ready'));
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

  public async addUserSession(userId: string, rawSessionId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const fullSessionKey = this.getFullSessionKey(rawSessionId);

    await this.client.sAdd(userSessionsKey, fullSessionKey);
    await this.client.expire(userSessionsKey, this.sessionTtlSeconds);
  }

  public async removeUserSession(userId: string, rawSessionId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const fullSessionKey = this.getFullSessionKey(rawSessionId);

    await this.client.sRem(userSessionsKey, fullSessionKey);
  }

  public async getUserSessions(userId: string): Promise<UserActiveSession[]> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionKeys = await this.client.sMembers(userSessionsKey);

    if (!sessionKeys.length) {
      return [];
    }

    const activeSessions: UserActiveSession[] = [];

    for (const fullKey of sessionKeys) {
      const rawData = await this.client.get(fullKey);

      // Sesiune expirată în Redis — o scoatem din Set
      if (!rawData) {
        await this.client.sRem(userSessionsKey, fullKey);
        continue;
      }

      try {
        const sessionData = JSON.parse(rawData) as StoredSessionPayload;
        const ttlSeconds = await this.client.ttl(fullKey);

        activeSessions.push({
          sessionId: fullKey.startsWith(this.sessionPrefix)
            ? fullKey.slice(this.sessionPrefix.length)
            : fullKey,
          deviceData: sessionData.deviceData ?? null,
          ttlSeconds,
        });
      } catch {
        continue;
      }
    }

    return activeSessions;
  }

  public async removeAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.getUserSessionsKey(userId);
    const sessionKeys = await this.client.sMembers(userSessionsKey);

    if (sessionKeys.length > 0) {
      await this.client.del(sessionKeys);
    }

    await this.client.del(userSessionsKey);
  }

  private getUserSessionsKey(userId: string): string {
    return `user:sessions:${userId}`;
  }

  private getFullSessionKey(sessionId: string): string {
    return sessionId.startsWith(this.sessionPrefix)
      ? sessionId
      : `${this.sessionPrefix}${sessionId}`;
  }
}
