import type { RedisClientType } from 'redis';

import { RedisService } from '../redis';
import { SessionRepository } from './session.repository';

const SESSION_CONFIG = {
  secret: 's'.repeat(32),
  cookieName: 'sessionId',
  cookieDomain: 'localhost',
  keyPrefix: 'sessions:',
  maxAgeMs: 2_592_000_000,
  maxAgeSeconds: 2_592_000,
  secure: false,
  sameSite: 'lax',
} as const;

/** Implementare in-memory a comenzilor Redis folosite de repository. */
class FakeRedisClient {
  private readonly strings = new Map<string, string>();
  private readonly sets = new Map<string, Set<string>>();
  private readonly ttls = new Map<string, number>();

  public setSession(key: string, payload: unknown, ttlSeconds = 1000): void {
    this.strings.set(key, JSON.stringify(payload));
    this.ttls.set(key, ttlSeconds);
  }

  public setRaw(key: string, payload: string): void {
    this.strings.set(key, payload);
  }

  public sAdd(key: string, member: string): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    set.add(member);
    this.sets.set(key, set);

    return Promise.resolve(1);
  }

  public sRem(key: string, members: string | string[]): Promise<number> {
    const set = this.sets.get(key);
    const list = Array.isArray(members) ? members : [members];
    list.forEach((member) => set?.delete(member));

    return Promise.resolve(list.length);
  }

  public sMembers(key: string): Promise<string[]> {
    return Promise.resolve([...(this.sets.get(key) ?? [])]);
  }

  public expire(key: string, seconds: number): Promise<boolean> {
    this.ttls.set(key, seconds);

    return Promise.resolve(true);
  }

  public get(key: string): Promise<string | null> {
    return Promise.resolve(this.strings.get(key) ?? null);
  }

  public ttl(key: string): Promise<number> {
    return Promise.resolve(this.ttls.get(key) ?? -2);
  }

  public del(keys: string | string[]): Promise<number> {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => {
      this.strings.delete(key);
      this.ttls.delete(key);
    });

    return Promise.resolve(list.length);
  }

  public getTtl(key: string): number | undefined {
    return this.ttls.get(key);
  }
}

describe('SessionRepository', () => {
  let client: FakeRedisClient;
  let repository: SessionRepository;

  const indexKey = 'user:sessions:user-1';

  beforeEach(() => {
    client = new FakeRedisClient();

    const redisService = {
      getClient: () => client as unknown as RedisClientType,
    } as unknown as RedisService;

    repository = new SessionRepository(redisService, SESSION_CONFIG);
  });

  it('indexează sesiunea sub cheia completă și aliniază TTL-ul indexului', async () => {
    await repository.index('user-1', 'abc123');

    await expect(client.sMembers(indexKey)).resolves.toEqual(['sessions:abc123']);
    expect(client.getTtl(indexKey)).toBe(SESSION_CONFIG.maxAgeSeconds);
  });

  it('nu dublează prefixul dacă primește deja cheia completă', async () => {
    await repository.index('user-1', 'sessions:abc123');

    await expect(client.sMembers(indexKey)).resolves.toEqual(['sessions:abc123']);
  });

  it('citește sesiunile active cu metadatele dispozitivului', async () => {
    client.setSession('sessions:abc123', { userId: 'user-1', deviceData: { ip: '10.0.0.5' } }, 900);
    await repository.index('user-1', 'abc123');

    const sessions = await repository.findByUser('user-1');

    expect(sessions).toEqual([
      expect.objectContaining({
        sessionId: 'abc123',
        deviceData: { ip: '10.0.0.5' },
        expiresInSeconds: 900,
      }),
    ]);
  });

  it('curăță din index sesiunile care au expirat în Redis', async () => {
    await repository.index('user-1', 'expirata');

    await expect(repository.findByUser('user-1')).resolves.toEqual([]);
    await expect(client.sMembers(indexKey)).resolves.toEqual([]);
  });

  it('ignoră o sesiune cu payload corupt, fără să arunce', async () => {
    client.setRaw('sessions:coruptă', 'nu-e-json');
    await repository.index('user-1', 'coruptă');

    await expect(repository.findByUser('user-1')).resolves.toEqual([]);
  });

  it('derivă un id public stabil, diferit de session ID', () => {
    const first = repository.toPublicId('abc123');
    const second = repository.toPublicId('sessions:abc123');

    expect(first).toBe(second);
    expect(first).not.toContain('abc123');
    expect(first).toHaveLength(32);
  });

  it('șterge sesiunea identificată prin id public', async () => {
    client.setSession('sessions:abc123', { userId: 'user-1' });
    await repository.index('user-1', 'abc123');

    const deleted = await repository.deleteByPublicId('user-1', repository.toPublicId('abc123'));

    expect(deleted).toBe(true);
    await expect(client.get('sessions:abc123')).resolves.toBeNull();
    await expect(client.sMembers(indexKey)).resolves.toEqual([]);
  });

  it('raportează când id-ul public nu corespunde niciunei sesiuni', async () => {
    await expect(repository.deleteByPublicId('user-1', 'inexistent')).resolves.toBe(false);
  });

  it('păstrează sesiunea exceptată la ștergerea în masă', async () => {
    client.setSession('sessions:current', { userId: 'user-1' });
    client.setSession('sessions:other', { userId: 'user-1' });
    await repository.index('user-1', 'current');
    await repository.index('user-1', 'other');

    const removed = await repository.deleteAll('user-1', 'current');

    expect(removed).toBe(1);
    await expect(client.sMembers(indexKey)).resolves.toEqual(['sessions:current']);
  });

  it('șterge toate sesiunile când nu se face nicio excepție', async () => {
    client.setSession('sessions:one', { userId: 'user-1' });
    client.setSession('sessions:two', { userId: 'user-1' });
    await repository.index('user-1', 'one');
    await repository.index('user-1', 'two');

    await expect(repository.deleteAll('user-1')).resolves.toBe(2);
    await expect(client.sMembers(indexKey)).resolves.toEqual([]);
  });
});
