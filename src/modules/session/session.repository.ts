import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { RedisClientType } from 'redis';

import { sessionConfig } from '../../config';
import { DeviceData } from '../../common/types/express-session';
import { RedisService } from '../redis';

/** Forma serializată în Redis de `connect-redis`. */
interface StoredSession {
  cookie?: unknown;
  userId?: string;
  deviceData?: DeviceData;
}

/** O sesiune citită din store, împreună cu ambele forme ale identificatorului. */
export interface SessionRecord {
  /** Session ID real (credențială — nu se expune clientului). */
  sessionId: string;
  /** Identificator public derivat prin HMAC, sigur de trimis în API. */
  publicId: string;
  deviceData: DeviceData | null;
  expiresInSeconds: number;
}

/**
 * Accesul la sesiunile persistate în Redis.
 *
 * `connect-redis` scrie fiecare sesiune sub `<prefix><sessionId>`, dar nu oferă
 * niciun index invers. Repository-ul menține acest index (`user:sessions:<userId>`,
 * un Set de chei complete) ca să putem lista și revoca sesiunile unui utilizator.
 */
@Injectable()
export class SessionRepository {
  private static readonly USER_INDEX_PREFIX = 'user:sessions:';
  private static readonly PUBLIC_ID_LENGTH = 32;

  public constructor(
    private readonly redisService: RedisService,
    @Inject(sessionConfig.KEY) private readonly config: ConfigType<typeof sessionConfig>,
  ) {}

  private get client(): RedisClientType {
    return this.redisService.getClient();
  }

  /** Adaugă sesiunea în indexul utilizatorului și aliniază TTL-ul indexului. */
  public async index(userId: string, sessionId: string): Promise<void> {
    const indexKey = this.buildIndexKey(userId);

    await this.client.sAdd(indexKey, this.buildSessionKey(sessionId));
    await this.client.expire(indexKey, this.config.maxAgeSeconds);
  }

  /** Scoate sesiunea din index, fără a atinge sesiunea în sine. */
  public async deindex(userId: string, sessionId: string): Promise<void> {
    await this.client.sRem(this.buildIndexKey(userId), this.buildSessionKey(sessionId));
  }

  /**
   * Sesiunile încă valide ale utilizatorului. Cheile expirate între timp sunt
   * curățate din index, ca acesta să nu crească nelimitat.
   */
  public async findByUser(userId: string): Promise<SessionRecord[]> {
    const indexKey = this.buildIndexKey(userId);
    const sessionKeys = await this.client.sMembers(indexKey);

    if (sessionKeys.length === 0) {
      return [];
    }

    const records = await Promise.all(
      sessionKeys.map((sessionKey) => this.readSession(indexKey, sessionKey)),
    );

    return records.filter((record): record is SessionRecord => record !== null);
  }

  /** Șterge o sesiune identificată prin id-ul public. Întoarce `false` dacă nu există. */
  public async deleteByPublicId(userId: string, publicId: string): Promise<boolean> {
    const sessions = await this.findByUser(userId);
    const target = sessions.find((session) => session.publicId === publicId);

    if (!target) {
      return false;
    }

    await this.delete(userId, target.sessionId);

    return true;
  }

  public async delete(userId: string, sessionId: string): Promise<void> {
    await this.client.del(this.buildSessionKey(sessionId));
    await this.deindex(userId, sessionId);
  }

  /** Șterge toate sesiunile utilizatorului, opțional păstrând-o pe cea curentă. */
  public async deleteAll(userId: string, exceptSessionId?: string): Promise<number> {
    const sessions = await this.findByUser(userId);
    const doomed = sessions.filter((session) => session.sessionId !== exceptSessionId);

    if (doomed.length === 0) {
      return 0;
    }

    await this.client.del(doomed.map((session) => this.buildSessionKey(session.sessionId)));
    await this.client.sRem(
      this.buildIndexKey(userId),
      doomed.map((session) => this.buildSessionKey(session.sessionId)),
    );

    return doomed.length;
  }

  /**
   * Derivă un identificator public, stabil și nereversibil din session ID.
   * Clientul poate astfel gestiona sesiuni fără a cunoaște credențialele lor.
   */
  public toPublicId(sessionId: string): string {
    return createHmac('sha256', this.config.secret)
      .update(this.stripPrefix(sessionId))
      .digest('hex')
      .slice(0, SessionRepository.PUBLIC_ID_LENGTH);
  }

  private async readSession(indexKey: string, sessionKey: string): Promise<SessionRecord | null> {
    const [payload, ttlSeconds] = await Promise.all([
      this.client.get(sessionKey),
      this.client.ttl(sessionKey),
    ]);

    if (payload === null) {
      await this.client.sRem(indexKey, sessionKey);
      return null;
    }

    const stored = this.parsePayload(payload);

    if (!stored) {
      return null;
    }

    const sessionId = this.stripPrefix(sessionKey);

    return {
      sessionId,
      publicId: this.toPublicId(sessionId),
      deviceData: stored.deviceData ?? null,
      expiresInSeconds: Math.max(ttlSeconds, 0),
    };
  }

  private parsePayload(payload: string): StoredSession | null {
    try {
      return JSON.parse(payload) as StoredSession;
    } catch {
      return null;
    }
  }

  private buildIndexKey(userId: string): string {
    return `${SessionRepository.USER_INDEX_PREFIX}${userId}`;
  }

  private buildSessionKey(sessionId: string): string {
    return sessionId.startsWith(this.config.keyPrefix)
      ? sessionId
      : `${this.config.keyPrefix}${sessionId}`;
  }

  private stripPrefix(sessionKey: string): string {
    return sessionKey.startsWith(this.config.keyPrefix)
      ? sessionKey.slice(this.config.keyPrefix.length)
      : sessionKey;
  }
}
