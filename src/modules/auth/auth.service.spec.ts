import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';

import { tokenConfig } from '../../config';
import { HashService } from '../hash';
import { MailerService } from '../mailer';
import { SessionService } from '../session';
import { UsersService } from '../users';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const TOKEN_CONFIG = {
  secret: 's'.repeat(32),
  length: 6,
  maxAttempts: 5,
  passwordResetTtl: '5m',
} as const;

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2b$10$hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let hashService: jest.Mocked<Pick<HashService, 'hash' | 'compare' | 'getDummyHash'>>;
  let usersService: jest.Mocked<
    Pick<UsersService, 'existsByEmail' | 'findByEmail' | 'create' | 'changePassword'>
  >;
  let tokenService: jest.Mocked<Pick<TokenService, 'issue' | 'verify'>>;
  let mailerService: jest.Mocked<Pick<MailerService, 'sendPasswordResetEmail'>>;
  let sessionService: jest.Mocked<Pick<SessionService, 'revokeAll'>>;

  beforeEach(async () => {
    hashService = {
      hash: jest.fn().mockResolvedValue('$2b$10$new-hash'),
      compare: jest.fn().mockResolvedValue(true),
      getDummyHash: jest.fn().mockReturnValue('$2b$10$dummy'),
    };

    usersService = {
      existsByEmail: jest.fn().mockResolvedValue(false),
      findByEmail: jest.fn().mockResolvedValue(buildUser()),
      create: jest.fn().mockImplementation((email: string) => buildUser({ email })),
      changePassword: jest.fn().mockResolvedValue(buildUser()),
    };

    tokenService = {
      issue: jest
        .fn()
        .mockResolvedValue({ token: '123456', expiresAt: new Date(Date.now() + 300_000) }),
      verify: jest.fn().mockResolvedValue(undefined),
    };

    mailerService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    sessionService = { revokeAll: jest.fn().mockResolvedValue(2) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HashService, useValue: hashService },
        { provide: UsersService, useValue: usersService },
        { provide: TokenService, useValue: tokenService },
        { provide: MailerService, useValue: mailerService },
        { provide: SessionService, useValue: sessionService },
        { provide: tokenConfig.KEY, useValue: TOKEN_CONFIG },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creează contul cu parola hash-uită', async () => {
      await service.register({ email: 'nou@example.com', password: 'Parola123!' });

      expect(hashService.hash).toHaveBeenCalledWith('Parola123!');
      expect(usersService.create).toHaveBeenCalledWith('nou@example.com', '$2b$10$new-hash');
    });

    it('respinge un email deja folosit', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.register({ email: 'test@example.com', password: 'Parola123!' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hash-uiește parola și pentru un email existent, ca timpul de răspuns să nu difere', async () => {
      usersService.existsByEmail.mockResolvedValue(true);

      await expect(
        service.register({ email: 'test@example.com', password: 'Parola123!' }),
      ).rejects.toThrow(ConflictException);
      expect(hashService.hash).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('întoarce utilizatorul pentru credențiale valide', async () => {
      await expect(service.login({ email: 'test@example.com', password: 'x' })).resolves.toEqual(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('respinge o parolă greșită', async () => {
      hashService.compare.mockResolvedValue(false);

      await expect(service.login({ email: 'test@example.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('compară cu hash-ul fantomă atunci când emailul nu există', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'lipsa@example.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(hashService.compare).toHaveBeenCalledWith('x', '$2b$10$dummy');
    });
  });

  describe('forgotPassword', () => {
    it('trimite emailul de resetare pentru un cont existent', async () => {
      await service.forgotPassword({ email: 'test@example.com' });

      expect(mailerService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('răspunde identic pentru un email inexistent, fără a trimite email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const missing = await service.forgotPassword({ email: 'lipsa@example.com' });
      usersService.findByEmail.mockResolvedValue(buildUser());
      const existing = await service.forgotPassword({ email: 'test@example.com' });

      expect(missing.message).toBe(existing.message);
      expect(mailerService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('ascunde faptul că un cod este deja activ', async () => {
      tokenService.issue.mockRejectedValue(new BadRequestException('Cod încă valabil'));

      await expect(service.forgotPassword({ email: 'test@example.com' })).resolves.toEqual(
        expect.objectContaining({ message: expect.stringContaining('If an account exists') }),
      );
    });

    it('propagă erorile neașteptate', async () => {
      tokenService.issue.mockRejectedValue(new Error('Redis down'));

      await expect(service.forgotPassword({ email: 'test@example.com' })).rejects.toThrow(
        'Redis down',
      );
    });
  });

  describe('resetPassword', () => {
    const payload = {
      email: 'test@example.com',
      token: '123456',
      newPassword: 'ParolaNoua123!',
    };

    it('schimbă parola și închide toate sesiunile', async () => {
      await service.resetPassword(payload);

      expect(usersService.changePassword).toHaveBeenCalledWith('user-1', '$2b$10$new-hash');
      expect(sessionService.revokeAll).toHaveBeenCalledWith('user-1');
    });

    it('nu dezvăluie dacă emailul există', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.resetPassword(payload)).rejects.toThrow(/invalid/i);
      expect(usersService.changePassword).not.toHaveBeenCalled();
    });

    it('nu schimbă parola dacă codul e invalid', async () => {
      tokenService.verify.mockRejectedValue(new BadRequestException('Cod invalid'));

      await expect(service.resetPassword(payload)).rejects.toThrow(BadRequestException);
      expect(usersService.changePassword).not.toHaveBeenCalled();
      expect(sessionService.revokeAll).not.toHaveBeenCalled();
    });
  });
});
