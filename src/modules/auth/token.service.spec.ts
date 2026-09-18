import { BadRequestException } from '@nestjs/common';
import { TokenType, VerificationToken } from '@prisma/client';
import { createHmac } from 'node:crypto';

import { TokenRepository } from './token.repository';
import { TokenService } from './token.service';

const CONFIG = {
  secret: 's'.repeat(32),
  length: 6,
  maxAttempts: 3,
  emailVerificationTtl: '5m',
  passwordResetTtl: '5m',
} as const;

const USER_ID = 'user-1';
const TYPE: TokenType = 'EMAIL_VERIFICATION';

function hashOf(token: string): string {
  return createHmac('sha256', CONFIG.secret).update(token).digest('hex');
}

function storedToken(overrides: Partial<VerificationToken> = {}): VerificationToken {
  return {
    id: 'token-1',
    token: hashOf('123456'),
    type: TYPE,
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    userId: USER_ID,
    ...overrides,
  };
}

describe('TokenService', () => {
  let repository: jest.Mocked<TokenRepository>;
  let service: TokenService;

  beforeEach(() => {
    repository = {
      findActive: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(storedToken()),
      incrementAttempts: jest.fn().mockResolvedValue(storedToken({ attempts: 1 })),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TokenRepository>;

    service = new TokenService(repository, CONFIG);
  });

  describe('issue', () => {
    it('generează un cod numeric de lungimea configurată', async () => {
      const { token } = await service.issue(USER_ID, TYPE, '5m');

      expect(token).toMatch(/^\d{6}$/);
    });

    it('salvează doar hash-ul codului, niciodată codul în clar', async () => {
      const { token } = await service.issue(USER_ID, TYPE, '5m');

      expect(repository.save).toHaveBeenCalledWith(USER_ID, TYPE, hashOf(token), expect.any(Date));
    });

    it('refuză emiterea unui cod nou cât timp cel existent e valabil', async () => {
      repository.findActive.mockResolvedValue(storedToken());

      await expect(service.issue(USER_ID, TYPE, '5m')).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('permite emiterea când codul precedent a expirat', async () => {
      repository.findActive.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.issue(USER_ID, TYPE, '5m')).resolves.toBeDefined();
    });
  });

  describe('verify', () => {
    it('consumă codul corect', async () => {
      repository.findActive.mockResolvedValue(storedToken());

      await expect(service.verify(USER_ID, '123456', TYPE)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(USER_ID, TYPE);
    });

    it('numără încercările eșuate pentru un cod greșit', async () => {
      repository.findActive.mockResolvedValue(storedToken());

      await expect(service.verify(USER_ID, '000000', TYPE)).rejects.toThrow(BadRequestException);
      expect(repository.incrementAttempts).toHaveBeenCalledWith(USER_ID, TYPE);
    });

    it('invalidează codul după depășirea numărului de încercări', async () => {
      repository.findActive.mockResolvedValue(storedToken());
      repository.incrementAttempts.mockResolvedValue(storedToken({ attempts: CONFIG.maxAttempts }));

      await expect(service.verify(USER_ID, '000000', TYPE)).rejects.toThrow(/Prea multe încercări/);
      expect(repository.delete).toHaveBeenCalledWith(USER_ID, TYPE);
    });

    it('raportează codul expirat și îl consumă', async () => {
      repository.findActive.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.verify(USER_ID, '123456', TYPE)).rejects.toThrow(/a expirat/);
      expect(repository.delete).toHaveBeenCalledWith(USER_ID, TYPE);
    });

    it('nu incrementează încercările când nu există niciun cod', async () => {
      repository.findActive.mockResolvedValue(null);

      await expect(service.verify(USER_ID, '123456', TYPE)).rejects.toThrow(BadRequestException);
      expect(repository.incrementAttempts).not.toHaveBeenCalled();
    });
  });
});
