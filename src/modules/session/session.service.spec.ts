import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { SessionRepository, SessionRecord } from './session.repository';
import { SessionService } from './session.service';

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

type SessionCallback = (error?: Error | null) => void;

/** Request minimal cu un `session` care se comportă ca `express-session`. */
function buildRequest(
  overrides: { userId?: string; failOn?: 'regenerate' | 'save' | 'destroy' } = {},
) {
  const invoke = (operation: 'regenerate' | 'save' | 'destroy', callback: SessionCallback) =>
    callback(overrides.failOn === operation ? new Error('store indisponibil') : null);

  return {
    sessionID: 'abc123',
    headers: { 'user-agent': 'jest' },
    socket: { remoteAddress: '10.0.0.5' },
    ip: '10.0.0.5',
    session: {
      userId: overrides.userId,
      deviceData: undefined,
      regenerate: jest.fn((callback: SessionCallback) => invoke('regenerate', callback)),
      save: jest.fn((callback: SessionCallback) => invoke('save', callback)),
      destroy: jest.fn((callback: SessionCallback) => invoke('destroy', callback)),
    },
  } as unknown as Request;
}

function buildRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    sessionId: 'abc123',
    publicId: 'public-abc123',
    deviceData: null,
    expiresInSeconds: 1000,
    ...overrides,
  };
}

describe('SessionService', () => {
  let repository: jest.Mocked<SessionRepository>;
  let service: SessionService;

  beforeEach(() => {
    repository = {
      index: jest.fn().mockResolvedValue(undefined),
      deindex: jest.fn().mockResolvedValue(undefined),
      findByUser: jest.fn().mockResolvedValue([]),
      deleteByPublicId: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteAll: jest.fn().mockResolvedValue(0),
      toPublicId: jest.fn((sessionId: string) => `public-${sessionId}`),
    } as unknown as jest.Mocked<SessionRepository>;

    service = new SessionService(repository, SESSION_CONFIG);
  });

  describe('start', () => {
    it('regenerează sesiunea înainte de a o lega de utilizator', async () => {
      const request = buildRequest();

      await service.start(request, 'user-1');

      expect(request.session.regenerate).toHaveBeenCalled();
      expect(request.session.userId).toBe('user-1');
      expect(request.session.save).toHaveBeenCalled();
    });

    it('atașează metadatele dispozitivului', async () => {
      const request = buildRequest();

      await service.start(request, 'user-1');

      expect(request.session.deviceData).toEqual(
        expect.objectContaining({ ip: '10.0.0.5', loggedAt: expect.any(String) }),
      );
    });

    it('indexează sesiunea pentru a putea fi listată ulterior', async () => {
      await service.start(buildRequest(), 'user-1');

      expect(repository.index).toHaveBeenCalledWith('user-1', 'abc123');
    });

    it('nu indexează nimic dacă regenerarea eșuează', async () => {
      const request = buildRequest({ failOn: 'regenerate' });

      await expect(service.start(request, 'user-1')).rejects.toThrow(InternalServerErrorException);
      expect(repository.index).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('scoate sesiunea din index și o distruge', async () => {
      const request = buildRequest({ userId: 'user-1' });

      await service.destroy(request);

      expect(repository.deindex).toHaveBeenCalledWith('user-1', 'abc123');
      expect(request.session.destroy).toHaveBeenCalled();
    });

    it('funcționează și pentru o sesiune fără utilizator atașat', async () => {
      const request = buildRequest();

      await service.destroy(request);

      expect(repository.deindex).not.toHaveBeenCalled();
      expect(request.session.destroy).toHaveBeenCalled();
    });

    it('semnalează eșecul de la store', async () => {
      await expect(service.destroy(buildRequest({ failOn: 'destroy' }))).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('listActive', () => {
    it('marchează sesiunea curentă și o pune prima', async () => {
      repository.findByUser.mockResolvedValue([
        buildRecord({ sessionId: 'other', publicId: 'public-other' }),
        buildRecord(),
      ]);

      const sessions = await service.listActive('user-1', 'abc123');

      expect(sessions[0]).toEqual(
        expect.objectContaining({ id: 'public-abc123', isCurrent: true }),
      );
      expect(sessions[1]).toEqual(
        expect.objectContaining({ id: 'public-other', isCurrent: false }),
      );
    });

    it('expune doar identificatorul public, nu session ID-ul din store', async () => {
      repository.findByUser.mockResolvedValue([buildRecord()]);

      const [session] = await service.listActive('user-1', 'abc123');

      expect(session).toEqual({
        id: 'public-abc123',
        deviceData: null,
        expiresInSeconds: 1000,
        isCurrent: true,
      });
      expect(session).not.toHaveProperty('sessionId');
    });
  });

  describe('revoke', () => {
    it('închide sesiunea cerută', async () => {
      await service.revoke('user-1', 'public-abc123');

      expect(repository.deleteByPublicId).toHaveBeenCalledWith('user-1', 'public-abc123');
    });

    it('raportează 404 pentru o sesiune inexistentă', async () => {
      repository.deleteByPublicId.mockResolvedValue(false);

      await expect(service.revoke('user-1', 'necunoscut')).rejects.toThrow(NotFoundException);
    });
  });

  it('păstrează sesiunea curentă când revocă celelalte dispozitive', async () => {
    repository.deleteAll.mockResolvedValue(3);

    await expect(service.revokeOthers('user-1', 'abc123')).resolves.toBe(3);
    expect(repository.deleteAll).toHaveBeenCalledWith('user-1', 'abc123');
  });

  it('închide toate sesiunile la revocare totală', async () => {
    await service.revokeAll('user-1');

    expect(repository.deleteAll).toHaveBeenCalledWith('user-1');
  });

  it('șterge cookie-ul cu exact aceleași opțiuni cu care a fost setat', () => {
    const response = { clearCookie: jest.fn() } as unknown as Response;

    service.clearCookie(response);

    expect(response.clearCookie).toHaveBeenCalledWith('sessionId', {
      path: '/',
      domain: 'localhost',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  });
});
