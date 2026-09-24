import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TokenType } from '@prisma/client';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { StringValue } from 'ms';

import { toMilliseconds } from '../../common/utils';
import { tokenConfig } from '../../config';
import { TokenRepository } from './token.repository';

/** Codul trimis utilizatorului, împreună cu momentul expirării. */
export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Codurile OTP pentru verificarea emailului și resetarea parolei.
 *
 * Garanții de securitate:
 * - codul e generat cu `randomInt` (CSPRNG), nu cu `Math.random`;
 * - în baza de date se salvează doar HMAC-ul, deci un dump de DB nu expune coduri valide;
 * - comparația e constant-time, ca să nu permită atacuri de tip timing;
 * - încercările eșuate sunt numărate și tokenul e invalidat la depășirea limitei.
 */
@Injectable()
export class TokenService {
  private static readonly MESSAGES = {
    TOKEN_STILL_VALID:
      'A code was already sent and is still valid. Wait before requesting another one.',
    TOKEN_INVALID: 'The code is invalid.',
    TOKEN_EXPIRED: 'The code has expired.',
    TOO_MANY_ATTEMPTS: 'Too many attempts. Request a new code.',
  } as const;

  public constructor(
    private readonly repository: TokenRepository,
    @Inject(tokenConfig.KEY) private readonly config: ConfigType<typeof tokenConfig>,
  ) {}

  /** Emite un cod nou, refuzând suprascrierea unuia încă valabil (anti-spam pe email). */
  public async issue(userId: string, type: TokenType, ttl: StringValue): Promise<IssuedToken> {
    await this.ensureNoActiveToken(userId, type);

    const token = this.generateCode();
    const expiresAt = new Date(Date.now() + toMilliseconds(ttl));

    await this.repository.save(userId, type, this.hash(token), expiresAt);

    return { token, expiresAt };
  }

  /**
   * Validează codul primit de la client și îl consumă la succes.
   * Aruncă `BadRequestException` pentru orice eșec, fără a dezvălui care condiție a picat.
   */
  public async verify(userId: string, token: string, type: TokenType): Promise<void> {
    const activeToken = await this.repository.findActive(userId, type);

    if (!activeToken || !this.matches(token, activeToken.token)) {
      await this.registerFailedAttempt(userId, type, activeToken !== null);
      throw new BadRequestException(TokenService.MESSAGES.TOKEN_INVALID);
    }

    await this.repository.delete(userId, type);

    if (activeToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(TokenService.MESSAGES.TOKEN_EXPIRED);
    }
  }

  private async ensureNoActiveToken(userId: string, type: TokenType): Promise<void> {
    const activeToken = await this.repository.findActive(userId, type);

    if (activeToken && activeToken.expiresAt.getTime() > Date.now()) {
      throw new BadRequestException(TokenService.MESSAGES.TOKEN_STILL_VALID);
    }
  }

  private async registerFailedAttempt(
    userId: string,
    type: TokenType,
    tokenExists: boolean,
  ): Promise<void> {
    if (!tokenExists) {
      return;
    }

    const { attempts } = await this.repository.incrementAttempts(userId, type);

    if (attempts >= this.config.maxAttempts) {
      await this.repository.delete(userId, type);
      throw new BadRequestException(TokenService.MESSAGES.TOO_MANY_ATTEMPTS);
    }
  }

  private generateCode(): string {
    const upperBound = 10 ** this.config.length;

    return randomInt(0, upperBound).toString().padStart(this.config.length, '0');
  }

  private hash(token: string): string {
    return createHmac('sha256', this.config.secret).update(token).digest('hex');
  }

  private matches(plainToken: string, storedHash: string): boolean {
    const incoming = Buffer.from(this.hash(plainToken));
    const stored = Buffer.from(storedHash);

    if (incoming.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(incoming, stored);
  }
}
