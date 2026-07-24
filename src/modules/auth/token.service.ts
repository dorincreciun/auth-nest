import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '@prisma/client';
import ms, { StringValue } from 'ms';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { EnvironmentInterface } from '../../common/interfaces';
import { PrismaService } from '../prisma';

@Injectable()
export class TokenService {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly CODE_LENGTH = 6;

  private static readonly MESSAGES = {
    TOKEN_STILL_VALID:
      'Un cod de verificare a fost deja trimis și este încă valabil. Te rugăm să aștepți înainte de a solicita altul.',
    TOKEN_INVALID: 'Codul de verificare este invalid.',
    TOKEN_EXPIRED: 'Codul de verificare a expirat.',
    TOO_MANY_ATTEMPTS: 'Prea multe încercări. Cere un cod nou.',
  } as const;

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService<EnvironmentInterface>,
  ) {}

  /**
   * Creează un cod de verificare nou.
   * Salvează în DB doar hash-ul; returnează codul plain pentru email.
   */
  public async createToken(
    userId: string,
    type: TokenType,
    expiresIn: StringValue = '5m',
  ): Promise<{ token: string; expiresAt: Date }> {
    await this.ensureNoActiveToken(userId, type);

    const token = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + ms(expiresIn));

    await this.prismaService.verificationToken.upsert({
      where: { userId_type: { userId, type } },
      update: {
        token: this.hashToken(token),
        expiresAt,
        attempts: 0,
      },
      create: {
        userId,
        type,
        token: this.hashToken(token),
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Verifică un cod de verificare.
   * Compară constant-time, numără încercările eșuate și invalidează tokenul la succes / expirare / max attempts.
   */
  public async verifyToken(userId: string, token: string, type: TokenType): Promise<boolean> {
    const existingToken = await this.findToken(userId, type);

    if (!existingToken || !this.isTokenMatch(token, existingToken.token)) {
      await this.handleInvalidAttempt(userId, type, !!existingToken);
      throw new BadRequestException(TokenService.MESSAGES.TOKEN_INVALID);
    }

    if (new Date() > existingToken.expiresAt) {
      await this.deleteToken(userId, type);
      throw new BadRequestException(TokenService.MESSAGES.TOKEN_EXPIRED);
    }

    await this.deleteToken(userId, type);
    return true;
  }

  private async ensureNoActiveToken(userId: string, type: TokenType): Promise<void> {
    const existingToken = await this.findToken(userId, type);

    if (existingToken && existingToken.expiresAt > new Date()) {
      throw new BadRequestException(TokenService.MESSAGES.TOKEN_STILL_VALID);
    }
  }

  private async handleInvalidAttempt(
    userId: string,
    type: TokenType,
    tokenExists: boolean,
  ): Promise<void> {
    if (!tokenExists) {
      return;
    }

    const updated = await this.prismaService.verificationToken.update({
      where: { userId_type: { userId, type } },
      data: { attempts: { increment: 1 } },
    });

    if (updated.attempts >= TokenService.MAX_ATTEMPTS) {
      await this.deleteToken(userId, type);
      throw new BadRequestException(TokenService.MESSAGES.TOO_MANY_ATTEMPTS);
    }
  }

  private async findToken(userId: string, type: TokenType) {
    return this.prismaService.verificationToken.findUnique({
      where: { userId_type: { userId, type } },
    });
  }

  private async deleteToken(userId: string, type: TokenType) {
    return this.prismaService.verificationToken.delete({
      where: { userId_type: { userId, type } },
    });
  }

  private generateVerificationCode(): string {
    const max = 10 ** TokenService.CODE_LENGTH;
    return randomInt(0, max).toString().padStart(TokenService.CODE_LENGTH, '0');
  }

  private hashToken(token: string): string {
    const secret = this.configService.getOrThrow<string>('SESSION_SECRET');
    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private isTokenMatch(plainToken: string, storedHash: string): boolean {
    const incoming = Buffer.from(this.hashToken(plainToken));
    const stored = Buffer.from(storedHash);

    if (incoming.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(incoming, stored);
  }
}
